# GymTracker - Quick Start

## TL;DR - Get Running in 5 Minutes

### Step 1: Get Airtable Token
- Go to https://airtable.com/account/tokens
- Click "Create new token"
- Name: "GymTracker"
- Enable: `data.records:read` and `data.records:write`
- Select "Workout Tracker" base
- Copy token

### Step 2: Create React App
```bash
npx create-react-app gymtracker
cd gymtracker
npm install lucide-react
```

### Step 3: Add Files
1. Copy `workout-app.jsx` → `src/App.jsx`
2. Copy `index.css` → `src/index.css`
3. Copy other config files (tailwind.config.js, etc.)

### Step 4: Set Environment
Create `.env` file in project root:
```
REACT_APP_AIRTABLE_TOKEN=your_token_here
```

### Step 5: Run!
```bash
npm start
```

Open `http://localhost:3000` and start logging workouts!

---

## Deploy to Netlify (Free)

### Option A: Via GitHub (Auto-deploys on git push)
```bash
git init
git add .
git commit -m "GymTracker"
git push -u origin main
```
Then on Netlify.com: "New site from Git" → Connect GitHub → Add env var

### Option B: Via CLI
```bash
npm run build
npm install -g netlify-cli
netlify deploy --prod
```

---

## Test Credentials (Demo)
- Email: anything@example.com
- Password: anything
- Just use same email/password for signup, then login

---

## What Data Gets Saved to Airtable?
When you log a workout:
- Date (today)
- Exercise (selected)
- Weight (kg)
- Reps
- Sets

All logged to your "Excercise Log" table! ✅

---

## Next: Add User Isolation
To make workouts only visible to the user who logged them, add a "User Email" field to your Airtable Exercise Log table. See SETUP_INSTRUCTIONS.md for details.

---

## File Guide
- `workout-app.jsx` → Main React component (put in src/App.jsx)
- `SETUP_INSTRUCTIONS.md` → Complete setup guide
- `NETLIFY_DEPLOYMENT.md` → Deploy to production
- `.env.example` → Rename to .env and add your token
- `tailwind.config.js`, `postcss.config.js`, `index.css` → Styling

Enjoy! 💪
