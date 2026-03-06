# GymTracker - Multi-User Gym Workout Web App

## Quick Start Guide

This is a React web app that connects to your Airtable Workout Tracker base. Users can sign up, log in, and quickly log their workouts.

### Features
✅ User authentication (signup/login)
✅ Quick workout logging (Exercise → Weight → Reps → Sets)
✅ View today's workouts
✅ All data synced to your Airtable base
✅ Mobile-responsive design

---

## Setup Instructions

### Step 1: Get Your Airtable API Token

1. Go to https://airtable.com/account/tokens
2. Click "Create new token"
3. Name it "GymTracker"
4. Enable these scopes:
   - `data.records:read`
   - `data.records:write`
5. Select access to the "Workout Tracker" base
6. Click "Create token"
7. Copy the token (you'll need it next)

### Step 2: Create a React App

```bash
# Using Create React App (easiest)
npx create-react-app gymtracker
cd gymtracker

# Or using Vite (faster)
npm create vite@latest gymtracker -- --template react
cd gymtracker
npm install
```

### Step 3: Install Lucide Icons

```bash
npm install lucide-react
```

### Step 4: Set Up Environment Variables

Create a `.env` file in your project root:

```
REACT_APP_AIRTABLE_TOKEN=your_token_here
```

Replace `your_token_here` with the token from Step 1.

### Step 5: Add the App Component

1. Replace the content of `src/App.jsx` with the code from `workout-app.jsx`
2. Or copy it into a new file and import it

### Step 6: Run Locally

```bash
npm start
```

The app will open at `http://localhost:3000`

### Step 7: Deploy to Netlify

**Option A: Using Netlify CLI**

```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Option B: Using GitHub**

1. Push your code to GitHub
2. Go to https://app.netlify.com
3. Click "New site from Git"
4. Connect your GitHub account and select the repo
5. Set environment variable:
   - Key: `REACT_APP_AIRTABLE_TOKEN`
   - Value: Your Airtable token
6. Deploy!

---

## How It Works

### User Flow

1. **Signup**: User creates account with email/password
   - Data stored in browser's localStorage (for demo)
   - In production, use Firebase or a backend database

2. **Login**: User logs in with email/password

3. **Log Workout**:
   - Select exercise from your Airtable "List of Exercises"
   - Enter weight, reps, and sets
   - Hits Airtable API to create new record
   - Data saved to your "Excercise Log" table

4. **View Today's Workouts**:
   - Fetches all workouts logged today
   - Displays them with exercise name, weight, reps, sets

### Data Structure

The app expects these tables in your Airtable base:

**Excercise Log Table** (tblTRoCtQpFJzemGW):
- Date (date field)
- Excercise (link to exercises)
- Weight (kg) (number)
- Reps (number)
- Sets (number)

**List of Excercises Table** (tblPgjn1bzXKNn8jn):
- Excercise (text field)

These are already in your base! ✅

---

## Adding User-Specific Data (Important for Multi-User)

Currently, the app logs workouts but doesn't associate them with specific users in Airtable. For true multi-user support, you have two options:

### Option 1: Add User Email Field to Airtable (Simple)
1. Go to your Airtable "Excercise Log" table
2. Add a new field: `User Email` (single line text)
3. Update the app to include user email when logging:

```javascript
body: JSON.stringify({
  records: [{
    fields: {
      'Date': today,
      'Excercise': [selectedExercise],
      'Weight (kg)': parseFloat(weight),
      'Reps': parseInt(reps),
      'Sets': parseInt(sets),
      'User Email': user.email  // Add this line
    }
  }]
})
```

Then filter workouts by user email:
```javascript
const response = await fetch(
  `https://api.airtable.com/v0/${AIRTABLE_BASE}/${EXERCISE_LOG_TABLE}?filterByFormula=AND({Date}='${today}',{User Email}='${user.email}')`,
  ...
)
```

### Option 2: Use Firebase Authentication (More Secure)
1. Set up Firebase project at https://firebase.google.com
2. Replace the mock auth functions with Firebase SDK
3. Store user ID in Airtable instead of email

---

## Next Steps / Future Features

- 🔐 Integrate proper authentication (Firebase, Auth0, etc.)
- 📊 Add progress charts and stats dashboard
- 📱 Mobile app (React Native)
- 🤖 AI workout recommendations
- 👥 Share workouts with friends
- 📅 Weekly/monthly summaries
- ⚡ Personal records tracking
- 🏋️ Exercise form tips and videos

---

## Troubleshooting

### "Could not load exercises"
- Check your Airtable token is correct in `.env`
- Make sure token has read access to the base
- Check that `REACT_APP_` prefix is used in `.env`

### Workouts not saving
- Open browser DevTools (F12) and check Network tab
- Look for 404 or 403 errors from Airtable API
- Verify table IDs in the app match your base

### Deploy fails on Netlify
- Make sure `REACT_APP_AIRTABLE_TOKEN` is set in Netlify env vars
- Check that build command is `npm run build`
- Verify `package.json` has all dependencies listed

---

## Files Included

- `workout-app.jsx` - Main React component (copy this to `src/App.jsx`)
- `SETUP_INSTRUCTIONS.md` - This file

Enjoy tracking your gains! 💪
