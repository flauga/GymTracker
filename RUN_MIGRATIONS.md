# How to Run SQL Migrations in Supabase

## Method 1: Using Supabase Dashboard (Easiest)

### Step 1: Log into Supabase
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click on your project (e.g., `gym-tracker`)

### Step 2: Open SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click the **"New query"** button (top right)

### Step 3: Run the Schema Migration
1. Open this file: `supabase/migrations/001_initial_schema.sql`
2. Copy **all the text** from that file
3. Go back to Supabase SQL Editor
4. **Delete** the default `select 1;` query
5. **Paste** the entire migration SQL
6. Click the blue **"Run"** button (or press `Ctrl+Enter`)

You should see:
```
Success. No rows returned
```

And in the output below, you'll see creation messages for each table:
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
... (more CREATE TABLE messages)
CREATE INDEX
CREATE POLICY
... (more policy creation messages)
```

### Step 4: Run the Seed Migration
1. Click **"New query"** again
2. Open this file: `supabase/seed.sql`
3. Copy **all the text**
4. Paste into the new SQL Editor query
5. Click **"Run"**

You should see:
```
INSERT 0 56
```

This means 56 exercises were inserted successfully ✅

### Step 5: Verify Everything Worked

1. In the left sidebar, click **Table Editor**
2. You should see these tables listed:
   - `exercises` (56 rows)
   - `profiles`
   - `exercise_logs`
   - `workout_templates`
   - `template_exercises`

3. Click on **`exercises`** to view the 56 exercises (Bench Press, Squat, Deadlift, etc.)

---

## Method 2: Using Supabase CLI (Advanced)

If you have Node.js and want to use the command line:

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Link Your Project
```bash
cd E:/GymTrackerApp/files
supabase login
```

This will open a browser to generate an access token. Copy it and paste into the terminal.

### Step 3: Link to Your Project
```bash
supabase link --project-ref your-project-id
```

(You can find your project ID in Supabase dashboard → Settings → General → Reference ID)

### Step 4: Run Migrations
```bash
supabase db pull
```

Then:

```bash
supabase migration new initial_schema
```

This creates a new migration file. Copy the contents of `supabase/migrations/001_initial_schema.sql` into it.

Then push:
```bash
supabase db push
```

### Step 5: Seed the Data
```bash
supabase seed run
```

---

## Troubleshooting

### "Error: relation already exists"
- You already ran the migration. To reset:
  1. Go to Supabase dashboard → Settings → Danger Zone
  2. Click **"Reset database"**
  3. Confirm
  4. Re-run the migrations

### "Error: permission denied for schema public"
- Your Supabase project may not have fully initialized
- Wait 2-3 minutes and try again

### "INSERT 0 0" when seeding exercises
- The table already has data
- Either reset the database (see above) or just proceed — the exercises are already there

### Migrations don't show in Table Editor
- Refresh the page (F5)
- Or disconnect and reconnect to the project

---

## What Each Migration Does

### `001_initial_schema.sql`
Creates:
- **6 tables**: profiles, exercises, exercise_logs, workout_templates, template_exercises
- **Indexes**: for fast querying by user_id and date
- **Row-Level Security (RLS)**: users can only see/edit their own data
- **Triggers**: auto-create profile on signup, auto-update timestamps

### `seed.sql`
Inserts:
- **56 exercises**: Bench Press, Squats, Deadlifts, Pullups, Rows, Curls, etc.
- Categories: Chest, Back, Shoulders, Arms, Legs, Core, Olympic lifts

---

## Next Steps After Running Migrations

1. Update your `.env` file with Supabase credentials
2. Run `npm start` locally to test
3. Verify you can:
   - Sign up
   - See exercises in the dropdown
   - Log a workout
   - View in calendar

If all works locally, deploy to Vercel/Netlify (see SUPABASE_SETUP.md)
