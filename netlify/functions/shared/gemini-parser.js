async function parseWorkoutText(text, exerciseNames) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = `You are a workout data parser. Given freeform workout notes, extract structured workout entries.

AVAILABLE EXERCISES (you MUST match to one of these exactly):
${exerciseNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

RULES:
1. Extract each set as a separate entry with: date, exercise name (MUST be from the list above), weight in kg, and reps.
2. If the user wrote weights in lbs, convert to kg (divide by 2.205, round to 1 decimal).
3. If a date is mentioned (e.g., "Monday", "March 3", "3/3/2025", "today", "yesterday"), convert to YYYY-MM-DD format. Use the current year if not specified. If no date is given for an entry, use "UNKNOWN".
4. If the user wrote something like "3x10" or "3 sets of 10", produce 3 separate entries each with those reps.
5. Match exercise names to the closest available exercise from the list. For example "bench press" should match the most likely bench press variant. "pullups" should match "Pullups". Use your best judgment.
6. If an exercise mentioned cannot be matched to ANY available exercise, set exercise to "UNMATCHED" and include the original text.
7. If weight or reps are unclear or missing, set them to 0 and mark "needsReview": true.
8. Each entry represents ONE set.

Respond ONLY with valid JSON in this exact format:
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "exercise": "Exact exercise name from the list above",
      "weight": 50.0,
      "reps": 10,
      "needsReview": false,
      "originalText": "the relevant snippet from user input"
    }
  ],
  "unparseable": ["any lines you couldn't parse at all"]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: text }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  return JSON.parse(content);
}

module.exports = { parseWorkoutText };
