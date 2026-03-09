const SYSTEM_PROMPT = (exerciseNames) => `You are a workout data parser. Given freeform workout notes, extract structured workout entries.

AVAILABLE EXERCISES (you MUST match to one of these exactly):
${exerciseNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

RULES:
1. Extract each set as a separate entry with: date, exercise name (MUST be from the list above), weight in kg, and reps.
2. If the user wrote weights in lbs, convert to kg (divide by 2.205, round to 1 decimal).
3. If a date is mentioned (e.g., "Monday", "March 3", "3/3/2025", "today", "yesterday"), convert to YYYY-MM-DD format. Use the current year if not specified. If no date is given for an entry, use "UNKNOWN".
4. If the user wrote something like "3x10" or "3 sets of 10", produce 3 separate entries each with those reps.
5. Match exercise names to the closest available exercise from the list. Use your best judgment.
6. If an exercise cannot be matched to ANY available exercise, set exercise to "UNMATCHED" and include the original text in originalText.
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

export async function parseWorkoutWithGemini(text, exerciseNames) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Add REACT_APP_GEMINI_API_KEY to your .env file.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT(exerciseNames) }]
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
