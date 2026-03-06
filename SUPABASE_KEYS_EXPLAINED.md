# Supabase Keys Explained

## Which Key Do I Use?

### **Use the PUBLISHABLE KEY (anon public key)** ✅

In Supabase Settings → API, you'll see:

```
Project URL: https://xxxxx.supabase.co
anon public: eyJhbGc...  ← USE THIS ONE
service_role: eyJhbGc...  ← DO NOT USE THIS
```

### Why?

| Key | Purpose | Security | Use Case |
|-----|---------|----------|----------|
| **anon public** | For frontend/browser | Limited (RLS protects data) | ✅ Your React app |
| **service_role** | Backend server only | Full access to everything | ❌ Only for backend code |

### **In Your `.env` File:**

```bash
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Never put the service_role key in your frontend code!** It has full database access and would compromise security if exposed.

### How It Works

1. **Frontend** (your React app) uses the **anon public key**
2. **Row-Level Security (RLS)** enforces that users can only see/edit their own data
3. **Service role key** is only for backend code (Netlify Functions, Edge Functions, etc.)

The RLS policies you created in the migration ensure:
- User A can't see User B's workouts
- User A can't modify User B's templates
- Only exercises are readable by everyone

---

## Environment Variables

Your `.env` file should look like this:

```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to Get These Values

1. Go to Supabase Dashboard → Your Project
2. Left sidebar → **Settings** → **API**
3. Look for "Project API keys" section
4. **Project URL** → copy this
5. **anon public** → copy this (NOT service_role!)

### What NOT to Do

❌ **Don't commit `.env` to GitHub** — it contains secrets
❌ **Don't use service_role key** in your frontend
❌ **Don't share your keys** with anyone

---

## Keeping Secrets Safe

### In Development
- `.env` stays on your local machine only
- Add `.env` to `.gitignore` (should already be there)

### In Production (Vercel/Netlify)
- Set environment variables in the deployment platform's dashboard
- They're stored securely, not in your code
- Automatic injection at build time

### If You Accidentally Committed Secrets
1. Go to Supabase Settings → API
2. Click the refresh/rotate icon next to the key
3. This invalidates the old key immediately
4. Update `.env` and re-deploy

---

## Testing Your Keys

To verify your setup is correct:

1. Update `.env` with your real keys
2. Run `npm start`
3. Try to sign up: email `test@example.com`, password `test123`
4. If it works:
   - Keys are correct ✅
   - RLS is working ✅
   - Connection is secure ✅

If you get an error like "Invalid API key" or "Unauthorized":
- Double-check you copied the entire key (no spaces at start/end)
- Make sure it's the **anon public** key, not service_role
- Refresh your Supabase dashboard page
