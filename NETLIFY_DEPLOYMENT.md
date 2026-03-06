# Deploying GymTracker to Netlify

This guide will help you deploy your GymTracker app to Netlify in minutes.

## Prerequisites

- ✅ Airtable API token (from Step 1 in SETUP_INSTRUCTIONS.md)
- ✅ GitHub account (for easiest deployment)
- ✅ Netlify account (free at netlify.com)

---

## Option A: Deploy via GitHub (Recommended - Auto Updates)

### 1. Push Your Code to GitHub

```bash
# Initialize git repo (if not already done)
git init
git add .
git commit -m "Initial commit: GymTracker app"

# Create a new repo on GitHub.com, then:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gymtracker.git
git push -u origin main
```

### 2. Connect to Netlify

1. Go to https://app.netlify.com
2. Click **"New site from Git"**
3. Choose **GitHub** as the provider
4. Authorize Netlify to access your GitHub account
5. Select your **gymtracker** repository
6. Click **Deploy site**

### 3. Set Environment Variables

1. In Netlify, go to **Site settings** → **Build & deploy** → **Environment**
2. Click **Edit variables**
3. Add a new variable:
   - Key: `REACT_APP_AIRTABLE_TOKEN`
   - Value: Your Airtable token (from Step 1)
4. Click **Save**
5. Go back to **Deploys** and click **Trigger deploy**

**Your app is now live!** 🎉

Netlify will automatically redeploy whenever you push changes to GitHub.

---

## Option B: Deploy via Netlify CLI

### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 2. Build Your App

```bash
npm run build
```

This creates a `build/` folder with your app.

### 3. Deploy

```bash
netlify deploy --prod
```

Follow the prompts to:
- Connect your Netlify account
- Create a new site
- Select the `build` folder as deploy directory
- Add your Airtable token when prompted

---

## Option C: Manual Deploy (No GitHub)

### 1. Build Your App

```bash
npm run build
```

### 2. Upload to Netlify

1. Go to https://app.netlify.com/drop
2. Drag and drop your `build/` folder
3. Your site is deployed!

**Note**: Updates require re-uploading the build folder each time.

---

## After Deployment

### Get Your Live URL

Once deployed, Netlify gives you a live URL like:
```
https://your-app-123abc.netlify.app
```

Share this with anyone who wants to use the app!

### Custom Domain (Optional)

1. In Netlify, go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter your domain (e.g., `gymtracker.com`)
4. Follow DNS setup instructions

---

## Verifying Your Deployment

1. Open your live URL
2. Click **Create account**
3. Sign up with a test email
4. Try logging a workout
5. Check your Airtable base to verify the workout was recorded

---

## Troubleshooting Deployment

### "Could not load exercises" error

**Problem**: Airtable API returns 403 Forbidden

**Solution**:
1. Verify `REACT_APP_AIRTABLE_TOKEN` is set in Netlify env vars
2. Test the token by making a curl request:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.airtable.com/v0/appIX01WbrAucX0u3/tblPgjn1bzXKNn8jn
   ```
3. If it fails, regenerate your token at https://airtable.com/account/tokens

### Build fails on Netlify

**Problem**: "Cannot find module..."

**Solution**:
1. Check that `package-lock.json` is in your repo
2. Make sure all dependencies are in `package.json`
3. Verify build command is `npm run build` in Site settings

### Environmental variables not working

**Problem**: App says "undefined" for token

**Solution**:
1. Make sure variable key is `REACT_APP_AIRTABLE_TOKEN` (with prefix!)
2. Netlify requires the `REACT_APP_` prefix for frontend apps
3. Redeploy after adding env var: **Deploys** → **Trigger deploy**

### CORS errors when calling Airtable API

**Note**: Airtable's public API allows direct calls from browsers, so you shouldn't get CORS errors. If you do:

1. Check browser console (F12) for exact error
2. Verify your base ID and table IDs are correct
3. Confirm token has read/write permissions

---

## Updating Your App

### Making changes locally

```bash
# Edit files in your editor
git add .
git commit -m "Update workout logging"
git push origin main
```

Netlify will automatically redeploy within seconds! ✨

---

## Next Steps

- Add more features (progress charts, goals, etc.)
- Set up proper user authentication with Firebase
- Share your live link with friends/teammates
- Track everyone's workouts in one place!

---

## Need Help?

- Netlify Docs: https://docs.netlify.com
- Airtable API: https://airtable.com/developers/web/api/introduction
- React Docs: https://react.dev

Happy deploying! 🚀
