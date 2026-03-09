const { parseWorkoutText } = require('./shared/gemini-parser');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const { text, userEmail } = JSON.parse(event.body);
    if (!text || !userEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'text and userEmail are required' })
      };
    }

    // 1. Fetch exercise list from Supabase
    const exercises = await fetchExercises();
    const exerciseNames = exercises.map(e => e.name);

    // 2. Parse with Gemini
    const parsed = await parseWorkoutText(text, exerciseNames);

    // 3. Attach exercise IDs to matched entries
    const entries = (parsed.entries || []).map(entry => {
      if (entry.exercise === 'UNMATCHED') {
        return { ...entry, exerciseId: null, matched: false };
      }
      const exercise = exercises.find(e => e.name === entry.exercise);
      if (exercise) {
        return { ...entry, exerciseId: exercise.id, matched: true };
      }
      // Fuzzy fallback: case-insensitive partial match
      const lower = entry.exercise.toLowerCase();
      const fuzzy = exercises.find(
        e => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase())
      );
      if (fuzzy) {
        return { ...entry, exercise: fuzzy.name, exerciseId: fuzzy.id, matched: true, fuzzyMatch: true };
      }
      return { ...entry, exerciseId: null, matched: false };
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ entries, unparseable: parsed.unparseable || [] })
    };
  } catch (err) {
    console.error('Parse workout error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message })
    };
  }
};

async function fetchExercises() {
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables not configured');
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises?select=id,name&order=name`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase error fetching exercises: ${response.status} - ${err}`);
  }

  return response.json();
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
