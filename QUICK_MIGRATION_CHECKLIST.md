# Quick Migration Checklist ✅

## 5-Minute Setup

### ☐ Step 1: Open Supabase SQL Editor
- [ ] Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] Click your project name
- [ ] Left sidebar → **SQL Editor**
- [ ] Click **"New query"**

### ☐ Step 2: Run Schema Migration
- [ ] Open file: `supabase/migrations/001_initial_schema.sql`
- [ ] Copy all text
- [ ] Paste into Supabase SQL Editor (replace `select 1;`)
- [ ] Click **"Run"** button
- [ ] Wait for success message ✅

### ☐ Step 3: Run Seed Data
- [ ] Click **"New query"**
- [ ] Open file: `supabase/seed.sql`
- [ ] Copy all text
- [ ] Paste into new SQL Editor query
- [ ] Click **"Run"** button
- [ ] Should see: `INSERT 0 56` ✅

### ☐ Step 4: Verify Tables Exist
- [ ] Left sidebar → **Table Editor**
- [ ] Should see tables:
  - [ ] exercises (56 rows)
  - [ ] profiles
  - [ ] exercise_logs
  - [ ] workout_templates
  - [ ] template_exercises

### ☐ Step 5: Get API Keys
- [ ] Left sidebar → **Settings** → **API**
- [ ] Copy **Project URL** → paste into `.env` as `REACT_APP_SUPABASE_URL`
- [ ] Copy **anon public key** → paste into `.env` as `REACT_APP_SUPABASE_ANON_KEY`

### ☐ Step 6: Test Locally
- [ ] `npm start`
- [ ] Try signing up: email `test@example.com`, password `test123`
- [ ] Should see dashboard with calendar and exercise dropdown

---

## File Locations in Your Project

```
E:/GymTrackerApp/files/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    ← Copy & paste this first
│   └── seed.sql                       ← Copy & paste this second
├── .env                               ← Put API keys here
└── workout-app.jsx                    ← App code (already updated)
```

---

## Expected Output

### After running `001_initial_schema.sql`:
```
Success. No rows returned

CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE OR REPLACE FUNCTION
CREATE TRIGGER
CREATE OR REPLACE FUNCTION
CREATE TRIGGER
```

### After running `seed.sql`:
```
INSERT 0 56
```

---

## Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Error: relation already exists" | Reset database in Settings → Danger Zone, then re-run |
| "Permission denied for schema public" | Wait 3 minutes, refresh, try again |
| "Syntax error at..." | Make sure you copied the ENTIRE file, not just part of it |
| Exercises dropdown empty | Verify seed.sql ran (should show `INSERT 0 56`) |
| Still blank? | Refresh browser (F5) and try again |

---

## You're Done! 🎉

Once all steps are complete:
- Your database is fully configured
- You have 56 exercises ready
- Your app is ready to deploy
- Users can sign up and track workouts

**Next:** Deploy to Vercel/Netlify following SUPABASE_SETUP.md
