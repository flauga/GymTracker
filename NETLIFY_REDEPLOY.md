# Netlify Redeploy Instructions

## What I Just Fixed

✅ Removed 41,099 `node_modules` files from GitHub
✅ Added `.gitignore` to prevent this happening again
✅ Pushed the fix to GitHub (`main` branch)

## Now Trigger Netlify Redeploy

1. Go to your Netlify dashboard: [app.netlify.com](https://app.netlify.com)
2. Click on your site (GymTracker or whatever it's named)
3. Go to **Deploys** (top menu)
4. Click **"Trigger deploy"** button (top right)
5. Select **"Deploy site"** (or **"Clear cache and deploy"** for a fresh install)
6. Wait for the build to finish (~2-3 minutes)

## What Will Happen

- Netlify will pull the latest `main` branch from GitHub
- It will see the updated code WITHOUT `node_modules`
- It will run: `npm install` (fresh install of dependencies)
- It will run: `npm run build` (with proper react-scripts permissions)
- Build should succeed ✅

## Check the Build

In Netlify, you'll see:

```
✓ Cloning repository
✓ Installing dependencies
✓ Building site
✓ Site is live at https://your-site.netlify.app
```

If you see "react-scripts: Permission denied" error again:
- Something is still wrong locally
- Try this command: `npm ci && npm run build` locally to test

## Test Your Live Site

Once deployed:

1. Visit your Netlify URL (e.g., https://your-site.netlify.app)
2. Try signing up with email + password
3. Should see the login page, then dashboard
4. Try logging a workout
5. Check calendar view

## If It Still Fails

The build log should show one of:
- ✅ Success
- ❌ "Missing environment variables" → add them to Netlify Settings → Build & deploy → Environment
- ❌ Some other error → send me the error message

---

## Why This Happened

When you ran `npm install` locally, it created `node_modules/` with proper file permissions. But when you committed it to git, git stored the file permissions as-is. When Netlify cloned the repo, those broken permissions came with it, making `react-scripts` unexecutable.

**Solution:** Never commit `node_modules/` — let each environment install fresh with `npm install`.

The `.gitignore` file I created prevents this from happening again.

---

## Next Time

If you accidentally commit node_modules again:

```bash
# Remove from git
git rm -r --cached node_modules

# Add to .gitignore (if not already there)
echo "node_modules/" >> .gitignore

# Commit
git add .gitignore
git commit -m "Remove node_modules from git"

# Push
git push
```

That's it!
