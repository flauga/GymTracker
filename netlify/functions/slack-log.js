/**
 * Slack Slash Command handler for workout logging.
 *
 * Setup in Slack:
 *  1. Create a Slack App at https://api.slack.com/apps
 *  2. Add a Slash Command: /gymlog → https://yourapp.netlify.app/.netlify/functions/slack-log
 *  3. Copy the "Signing Secret" and add it to Netlify env: SLACK_SIGNING_SECRET
 *  4. In the app, go to Settings → Slack Integration and save your Slack User ID.
 *
 * Usage in Slack:
 *  /gymlog bench press 100kg x5
 *  /gymlog squat 120 3x8
 *  /gymlog deadlift 140kg 5 reps
 */

const crypto = require('crypto');
const { parseWorkoutText } = require('./shared/gemini-parser');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify Slack request signature
  const slackTimestamp = event.headers['x-slack-request-timestamp'];
  const slackSignature = event.headers['x-slack-signature'];

  if (SLACK_SIGNING_SECRET && slackTimestamp && slackSignature) {
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    if (parseInt(slackTimestamp) < fiveMinutesAgo) {
      return { statusCode: 403, body: 'Request too old' };
    }
    const sigBase = `v0:${slackTimestamp}:${event.body}`;
    const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET);
    const expectedSig = `v0=${hmac.update(sigBase).digest('hex')}`;
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(slackSignature))) {
      return { statusCode: 403, body: 'Invalid signature' };
    }
  }

  // Parse URL-encoded Slack payload
  const params = new URLSearchParams(event.body);
  const slackUserId = params.get('user_id');
  const text = params.get('text') || '';
  const responseUrl = params.get('response_url');

  if (!text.trim()) {
    return slackResponse('Usage: `/gymlog bench press 100kg x5`\nType your exercise, weight, and reps.');
  }

  // Find the app user by slack_user_id
  const profile = await findUserBySlackId(slackUserId);
  if (!profile) {
    return slackResponse(
      `Your Slack account isn\'t linked yet. Open the GymTracker app → Settings → Slack Integration and save your Slack User ID: *${slackUserId}*`
    );
  }

  try {
    // Fetch exercises from Supabase
    const exercises = await fetchExercises();
    const exerciseNames = exercises.map(e => e.name);

    // Parse with Gemini — use today's date as context
    const today = new Date().toISOString().split('T')[0];
    const parsed = await parseWorkoutText(`Today (${today}): ${text}`, exerciseNames);

    const entries = (parsed.entries || []).map(entry => {
      if (entry.exercise === 'UNMATCHED') return { ...entry, exerciseId: null, matched: false };
      const ex = exercises.find(e => e.name === entry.exercise);
      if (ex) return { ...entry, exerciseId: ex.id, matched: true };
      const lower = entry.exercise.toLowerCase();
      const fuzzy = exercises.find(
        e => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase())
      );
      if (fuzzy) return { ...entry, exercise: fuzzy.name, exerciseId: fuzzy.id, matched: true };
      return { ...entry, exerciseId: null, matched: false };
    });

    const matched = entries.filter(e => e.matched && e.exerciseId);
    const unmatched = entries.filter(e => !e.matched);

    if (matched.length === 0) {
      return slackResponse(`Couldn\'t match any exercises. Try something like: \`bench press 100kg 5 reps\``);
    }

    // Log to Supabase
    const records = matched.map(e => ({
      user_id: profile.id,
      exercise_id: e.exerciseId,
      date: e.date === 'UNKNOWN' ? today : e.date,
      weight_kg: e.weight || 0,
      reps: e.reps || 0,
      sets: 1,
    }));

    await bulkInsertLogs(records);

    let reply = `Logged ${matched.length} set${matched.length !== 1 ? 's' : ''}:\n`;
    matched.forEach(e => {
      reply += `• *${e.exercise}* — ${e.weight}kg × ${e.reps} reps\n`;
    });
    if (unmatched.length > 0) {
      reply += `\nCouldn\'t match: ${unmatched.map(e => e.originalText || e.exercise).join(', ')}`;
    }

    return slackResponse(reply);
  } catch (err) {
    console.error('slack-log error:', err);
    return slackResponse(`Error logging workout: ${err.message}`);
  }
};

function slackResponse(text) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response_type: 'ephemeral', text }),
  };
}

async function findUserBySlackId(slackUserId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?slack_user_id=eq.${encodeURIComponent(slackUserId)}&select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function fetchExercises() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises?select=id,name&order=name`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error('Failed to fetch exercises');
  return res.json();
}

async function bulkInsertLogs(records) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercise_logs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(records),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to insert logs: ${err}`);
  }
}
