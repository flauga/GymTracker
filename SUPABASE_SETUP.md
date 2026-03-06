# Supabase Setup & Deployment Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New project"**
3. Fill in:
   - **Name**: `gym-tracker` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Pick closest to your users (e.g., `us-east-1` for US)
4. Click **"Create new project"** and wait 2-3 minutes for it to initialize

## Step 2: Run Database Migrations

Once your project is ready:

1. Go to **SQL Editor** in the left sidebar
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor and click **"Run"**
5. You should see success messages for all CREATE TABLE, CREATE INDEX, CREATE POLICY statements

Then:

1. Click **"New Query"** again
2. Copy the entire contents of `supabase/seed.sql`
3. Paste and click **"Run"**
4. You should see a message like "INSERT 0 56" (all exercises inserted)

## Step 3: Get Your API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Under "Project API keys", you'll see:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (this is your `REACT_APP_SUPABASE_ANON_KEY`)
3. Copy both values

## Step 4: Update Your `.env` File

Replace the placeholder values in your `.env` file:

```bash
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

## Step 5: Test Locally

```bash
npm start
```

The app should now:
- Load the login page ✅
- Let you sign up with email/password ✅
- Authenticate via Supabase ✅
- Load exercises from the database ✅

Try:
1. Click "Create account"
2. Enter email: `test@example.com`, password: `password123`
3. Click "Sign Up"
4. You should see the dashboard with the calendar and exercise list

## Step 6: (Optional) Enable Email Confirmation

By default, Supabase auto-logs in users after signup. If you want email confirmation:

1. Go to **Authentication** → **Providers** (left sidebar)
2. Find **Email**
3. Toggle on **"Confirm email"**
4. Users will need to confirm via email before they can log in

## Step 7: Deploy to Production

### Option A: Deploy to Vercel (Recommended)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: migrate from Airtable to Supabase"
   git remote add origin https://github.com/YOUR_USERNAME/gym-tracker-app.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)

3. Click **"Import Git Repository"** and select your repo

4. In **Environment Variables**, add:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

5. Click **"Deploy"**

Your app will be live at `https://your-app.vercel.app` 🚀

### Option B: Deploy to Netlify

1. Push to GitHub (same as above)

2. Go to [netlify.com/drop](https://app.netlify.com/)

3. Click **"Import an existing project"** → **GitHub**

4. Select your repo

5. In **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `build`

6. Go to **Site settings** → **Build & deploy** → **Environment**

7. Add environment variables:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

8. Trigger a redeploy

Your app will be live at `https://your-site.netlify.app` 🚀

## Step 8: Test Production

Once deployed, test:
1. Sign up with a new email
2. Log a workout
3. View the calendar
4. Create a template
5. Check that data persists after logout/login

## Troubleshooting

**"Missing environment variables" error:**
- Make sure `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set in your deployment platform's environment variables
- Rebuild/redeploy after adding them

**"Auth error" when signing up:**
- Check that your Supabase project is running (go to Settings → Project Info)
- Verify the URL and key are correct (copy-paste, don't retype)

**"Database connection error":**
- Make sure the SQL migrations ran successfully (check Supabase SQL Editor)
- Verify RLS policies are enabled (should be automatic)

**Exercises list is empty:**
- Run the `seed.sql` migration again to populate exercises

## What's Next?

Now that your database is set up:

### High Priority (for production)
1. **Input validation** — Add checks for weight (positive), reps (positive integer), date (valid)
2. **Error handling** — Better error messages when database operations fail
3. **Rate limiting** — Protect against abuse on signup/login

### Medium Priority (to scale)
1. **Component splitting** — Break `workout-app.jsx` into smaller, reusable components
2. **React Router** — Add proper URL routing instead of `page` state
3. **Tests** — Add Jest + React Testing Library tests for critical flows

### Lower Priority (when users request)
1. **TypeScript** — Gradually add type safety
2. **State management** — Extract shared state to Context or Zustand
3. **Supabase Edge Functions** — Move Netlify Functions to Supabase
4. **Real-time updates** — Add Supabase subscriptions for collaborative features

## Database Structure Reference

Your Supabase project now has:

| Table | Purpose |
|-------|---------|
| `auth.users` | Built-in auth (email, password hash, UUID) |
| `profiles` | User info: phone, display_name, whatsapp_linked |
| `exercises` | 56 predefined exercises (Bench Press, Squats, etc.) |
| `exercise_logs` | Workout records (user_id, exercise_id, weight, reps, date) |
| `workout_templates` | User's custom workout plans |
| `template_exercises` | Junction table (templates → exercises) |

All tables have Row-Level Security (RLS) enabled — users can only see/edit their own data.

---

**Questions?** Check the [Supabase docs](https://supabase.com/docs) or file an issue on GitHub.
