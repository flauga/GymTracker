# Branch Strategy & Netlify Redeployment

## Current Situation

- **`main` branch**: New Supabase version (current, better)
- **`branch` branch**: Old Airtable version (on Netlify)
- **Goal**: Deploy the new Supabase version to replace the old one

---

## Option A: Update Netlify to Deploy from `main` (Recommended)

This replaces your old Airtable deployment with the new Supabase version.

### Step 1: Go to Netlify Dashboard
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click on your site (the one currently deployed from `branch`)

### Step 2: Update Build Settings
1. Go to **Site settings** (top menu)
2. Click **Build & deploy** → **Deploy contexts**
3. Look for **Branch deploys** section
4. Find the row with your repo name
5. Click **Edit settings**
6. Change the branch from `branch` to `main`
7. Click **Save**

### Step 3: Add Environment Variables
1. In **Site settings**, go to **Build & deploy** → **Environment**
2. Click **Edit variables**
3. Add:
   ```
   REACT_APP_SUPABASE_URL = https://vjgxkllelwxozpzqehpp.supabase.co
   REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Click **Save**

### Step 4: Trigger Redeploy
1. In **Deploys**, click **Trigger deploy** → **Deploy site**
2. It will redeploy from the `main` branch with the new environment variables
3. Wait for the build to finish (should take ~2-3 minutes)

---

## Option B: Keep Both Versions (Separate Deployments)

If you want to keep the old Airtable version working and deploy Supabase separately:

### On Netlify
1. Create a new site for the Supabase version
2. Connect it to your GitHub repo
3. Set branch to `main`
4. Add environment variables (Supabase keys)
5. Deploy

You'll have two different URLs:
- Old: `https://old-site.netlify.app` (Airtable version)
- New: `https://new-site.netlify.app` (Supabase version)

---

## Option C: Use a Feature Branch for Testing (Advanced)

If you want to test the Supabase version before replacing the old one:

### Step 1: Create a Test Branch
```bash
git checkout -b supabase-test
git push origin supabase-test
```

### Step 2: Deploy to Netlify from Branch
1. Go to **Site settings** → **Build & deploy** → **Deploy contexts**
2. Add a **Branch deploy** for `supabase-test`
3. It will get its own preview URL

### Step 3: Test Everything
- Sign up, log workouts, check calendar
- Make sure Supabase connection works

### Step 4: Merge to Main & Deploy
Once tested:
```bash
git checkout main
git merge supabase-test
git push origin main
```

Then update Netlify to deploy from `main` (Option A)

---

## Recommended Path

I recommend **Option A** (simplest):

1. ✅ You already have credentials in `.env`
2. Go to Netlify Settings
3. Change deploy branch from `branch` to `main`
4. Add environment variables
5. Trigger redeploy
6. Done! Your new Supabase version is live

---

## What About the Old `branch` Branch?

You can:
- **Keep it**: Leave it on GitHub as a reference (old code)
- **Delete it**: `git push origin --delete branch`
- **Archive it**: Rename it to `archive/airtable-old`

It won't affect anything — Netlify only deploys whatever branch you tell it to.

---

## Testing After Redeployment

Once Netlify redeploys from `main`:

1. Visit your site URL (e.g., `https://your-site.netlify.app`)
2. Try to sign up with email + password
3. Check the console (F12) for errors
4. If you see "Missing environment variables" error:
   - Go back to Netlify Settings
   - Verify environment variables are set
   - Trigger redeploy again

---

## Rollback Plan

If something breaks:

1. Go to **Deploys** on Netlify
2. Find your last working deploy (from `branch`)
3. Click the three dots → **Publish deploy**
4. Your site reverts to that version immediately

You can always switch back while you debug.

---

## Environment Variables Needed

Make sure these are set in Netlify:

| Variable | Value |
|----------|-------|
| `REACT_APP_SUPABASE_URL` | `https://vjgxkllelwxozpzqehpp.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | (your anon key) |

Get these from Supabase → Settings → API

---

## Next Steps

1. Choose your approach (A, B, or C)
2. Follow the steps above
3. Test at your live URL
4. If all works, you can delete the old `branch` branch

Questions? Feel free to ask!
