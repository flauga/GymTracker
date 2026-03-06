# Push Your Code to GitHub from VS Code

## Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `gym-tracker-app` (or your preferred name)
3. **Description**: `Gym workout tracker with Supabase backend`
4. **Visibility**: Public (or Private if you prefer)
5. **Initialize README**: Leave unchecked
6. Click **"Create repository"**
7. Copy the HTTPS URL (looks like: `https://github.com/YOUR_USERNAME/gym-tracker-app.git`)

---

## Step 2: Initialize Git Locally

Open a terminal in VS Code:

1. Press **Ctrl + `** (backtick) to open the terminal
2. Make sure you're in the project directory:
   ```bash
   cd E:/GymTrackerApp/files
   ```

3. Initialize git:
   ```bash
   git init
   ```

4. Add your GitHub remote:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gym-tracker-app.git
   ```
   (Replace with your actual URL from step 1)

5. Verify it worked:
   ```bash
   git remote -v
   ```
   You should see:
   ```
   origin  https://github.com/YOUR_USERNAME/gym-tracker-app.git (fetch)
   origin  https://github.com/YOUR_USERNAME/gym-tracker-app.git (push)
   ```

---

## Step 3: Configure Git (First Time Only)

Set your name and email:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Step 4: Check What Will Be Pushed

1. Go to the **Source Control** tab in VS Code (left sidebar icon that looks like a branch)
2. You should see files listed under "Changes"
3. Verify `.env` is NOT in the list (if it is, see "Troubleshooting" below)

---

## Step 5: Stage All Files

In the terminal:

```bash
git add .
```

Or in VS Code:
- Click the **+** icon next to "Changes" to stage all

---

## Step 6: Commit

In the terminal:

```bash
git commit -m "Initial commit: migrate from Airtable to Supabase"
```

Or in VS Code:
1. Type the message in the "Message" box at the top
2. Press **Ctrl + Enter** to commit

---

## Step 7: Push to GitHub

In the terminal:

```bash
git branch -M main
git push -u origin main
```

Or in VS Code:
- Click the **Push** button (or press **Ctrl + Shift + P** → type "Push")

You might be asked to authenticate:
- Click **"Authorize via GitHub"** if prompted
- Or enter your GitHub username/password

---

## Done! ✅

Your code is now on GitHub. You can:
- View it at `https://github.com/YOUR_USERNAME/gym-tracker-app`
- Deploy to Vercel/Netlify by connecting this repo
- Collaborate with others by sharing the link

---

## How to Make Updates Later

After you make changes:

1. **Stage changes**: `git add .`
2. **Commit**: `git commit -m "Your message here"`
3. **Push**: `git push`

Or in VS Code Source Control tab:
1. Write a message
2. Click the checkmark to commit
3. Click the cloud icon to push

---

## Troubleshooting

### Problem: `.env` is in the Changes list

**Solution:** Create a `.gitignore` file to exclude it:

1. In VS Code, create a new file named `.gitignore` in the root directory
2. Add this content:
   ```
   .env
   .env.local
   node_modules/
   build/
   .DS_Store
   ```
3. Save and commit again

### Problem: "Permission denied" or authentication error

**Solution:** Generate a Personal Access Token:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: `gym-tracker-push`
4. Scopes: Check `repo`
5. Click **"Generate token"**
6. Copy the token
7. In VS Code terminal:
   ```bash
   git push
   ```
8. When prompted for password, paste the token (not your GitHub password)

### Problem: "fatal: not a git repository"

**Solution:** Run `git init` first:
```bash
cd E:/GymTrackerApp/files
git init
```

### Problem: "remote already exists"

**Solution:** Remove and re-add:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/gym-tracker-app.git
```

---

## Next Steps

Once on GitHub:

1. **Deploy to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your GitHub repo
   - Add environment variables (REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)
   - Click "Deploy"

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://app.netlify.com/)
   - Click "New site from Git"
   - Select your GitHub repo
   - Build command: `npm run build`
   - Publish directory: `build`
   - Add environment variables
   - Click "Deploy"

Your app will be live! 🚀
