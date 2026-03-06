# GymTracker - FAQ & Troubleshooting

## General Questions

### Q: Is my data secure?
**A:** For a personal app, yes! Your Airtable token is public (it's in the frontend), but Airtable's API has no way to delete or modify data without explicit permissions. For a team/public app, you should migrate to Option 2 (backend server) to hide the token.

### Q: Where is my data stored?
**A:** In your Airtable "Exercise Log" table. The app just reads/writes to it. You can see all your workouts directly in Airtable.

### Q: Can multiple people use this app?
**A:** Yes! Each person signs up separately. Their workouts are stored in the same Airtable table, but they won't see each other's data (unless you add user filtering - see SETUP_INSTRUCTIONS.md).

### Q: Can I add more features?
**A:** Absolutely! The app is open-source (the code is in `workout-app.jsx`). You can edit it to add whatever features you want.

### Q: How much does it cost?
**A:** Free! Netlify (hosting) is free, Airtable free tier includes 100 records. Once you have >100 workouts, Airtable is $5/month.

---

## Setup Issues

### "REACT_APP_AIRTABLE_TOKEN is undefined"

**Problem**: App says exercises are undefined or won't load

**Causes**:
1. `.env` file not created
2. Variable name is wrong (must be `REACT_APP_AIRTABLE_TOKEN` with prefix)
3. Token not copied correctly
4. App not restarted after creating .env

**Solutions**:
```bash
# Check .env exists and has correct content
cat .env
# Should show: REACT_APP_AIRTABLE_TOKEN=pat_xxxxx

# Restart the app
# Ctrl+C to stop
npm start
```

---

### "Cannot read property 'records' of undefined"

**Problem**: Exercises dropdown is empty or crashes

**Causes**:
1. Airtable token is invalid
2. API request failed (network error)
3. Table ID is wrong

**Solutions**:
```javascript
// Add logging to debug
// In workout-app.jsx, add after fetching exercises:
console.log('Response:', data);
console.log('Records:', data.records);

// Check DevTools (F12) > Console tab
```

1. Verify token at https://airtable.com/account/tokens
2. Make sure token has read access to base
3. Confirm base ID: `appIX01WbrAucX0u3`
4. Confirm exercises table ID: `tblPgjn1bzXKNn8jn`

---

### "Invalid token" or "unauthorized" error

**Problem**: API returns 403 Forbidden

**Causes**:
1. Token is invalid (expired or malformed)
2. Token doesn't have proper permissions
3. Token was copied wrong (extra spaces?)

**Solutions**:
```bash
# Test token with curl
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://api.airtable.com/v0/appIX01WbrAucX0u3/tblPgjn1bzXKNn8jn

# Should return JSON with records, not error
```

If it fails:
1. Delete old token at https://airtable.com/account/tokens
2. Create new token with exact scopes:
   - `data.records:read` ✓
   - `data.records:write` ✓
3. Copy entire token (no extra spaces)

---

## Deployment Issues

### Build fails with "Cannot find module"

**Problem**: `npm run build` fails on Netlify or locally

**Causes**:
1. Missing `package-lock.json`
2. Dependency not in `package.json`
3. Node version mismatch

**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Ensure package-lock.json exists
ls package-lock.json  # Should exist

# Try building again
npm run build
```

On Netlify:
1. Go to **Site settings** → **Build & deploy** → **Build command**
2. Ensure it's: `npm run build`
3. Ensure publish directory is: `build`

---

### Deployed app won't load exercises

**Problem**: Works locally but not on Netlify

**Causes**:
1. Environment variable not set in Netlify
2. Env var name is wrong
3. Deployed app using old version

**Solutions**:
1. In Netlify: **Site settings** → **Build & deploy** → **Environment**
2. Confirm variable: `REACT_APP_AIRTABLE_TOKEN=pat_xxxxx`
3. Redeploy: **Deploys** → **Trigger deploy**
4. Wait 2-3 minutes for new deploy
5. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

### CORS error from Airtable API

**Problem**: Console shows "No 'Access-Control-Allow-Origin' header"

**Note**: Airtable should allow CORS for this use case. If you get this:

**Solutions**:
1. Check that Airtable API is actually responding
2. Verify your base ID and table ID
3. Try from different browser
4. Clear browser cache

---

## Login/Auth Issues

### "User not found. Please signup first."

**Problem**: Login fails even though I signed up

**Causes**:
1. Used different email for signup vs login
2. Browser cleared localStorage
3. Typed password wrong (case sensitive)

**Solutions**:
- Sign up again with same email/password
- Check browser console to see what's stored: 
  ```javascript
  // In DevTools Console:
  localStorage.getItem('user')
  ```

### Lost my login/need to reset

**Problem**: Can't remember password or lost access

**Current limitation**: Since auth is in localStorage, there's no "forgot password"

**Solutions**:
- Sign up again with a new email
- Or clear localStorage and restart:
  ```javascript
  // In DevTools Console:
  localStorage.clear()
  // Then refresh page
  ```

---

## Data Issues

### Workouts not saving to Airtable

**Problem**: Form says "success" but workout doesn't appear in Airtable

**Causes**:
1. Airtable API rate limit
2. Invalid exercise ID
3. Airtable permissions issue
4. Network error (check if actually made request)

**Solutions**:
1. Check browser DevTools (F12) → Network tab
2. Look for POST request to `api.airtable.com`
3. Check response status:
   - 200 = Success (check Airtable directly)
   - 400 = Invalid data (check console for error)
   - 403 = Permission denied (check token)
   - 429 = Rate limited (wait & retry)

---

### Can't see my data in Airtable

**Problem**: I logged workouts but Airtable shows nothing

**Solutions**:
1. Refresh Airtable page (F5)
2. Check you're in the right base: "Workout Tracker"
3. Check the right table: "Excercise Log"
4. Filter might be hiding data:
   - Click the filter icon
   - Click "X" to clear all filters
5. Check "All fields" view is selected (not a filtered view)

---

### Exercise dropdown is empty

**Problem**: "Select exercise..." shows but no options

**Causes**:
1. Airtable exercises table is empty
2. API failed to load exercises (see "Cannot read property" section)
3. Exercise field name is wrong

**Solutions**:
1. Check Airtable "List of Exercises" table has records
2. Open DevTools (F12) → Console
3. Paste: `fetch('https://api.airtable.com/v0/appIX01WbrAucX0u3/tblPgjn1bzXKNn8jn', {headers: {Authorization: 'Bearer YOUR_TOKEN'}}).then(r => r.json()).then(d => console.log(d))`
4. Replace YOUR_TOKEN with your actual token
5. Check if exercises come back in console

---

## Performance Issues

### App is slow to load

**Normal**: First load takes 2-3 seconds (fetching exercises + today's workouts)

**If slower**:
1. Check network speed: F12 → Network tab
2. Look at request times to Airtable
3. If >5 seconds, could be rate limit

**Solutions**:
- Airtable free tier has rate limits
- Upgrade Airtable plan (expensive)
- Move to Option 2 (backend) for caching

---

### Form takes forever to submit

**Problem**: After clicking "Log Workout", takes 10+ seconds

**Causes**:
1. Network is slow
2. Airtable API is slow
3. Browser has many extensions

**Solutions**:
1. Check network (F12 → Network → Click "Log Workout")
2. Look at Airtable request time
3. Disable browser extensions temporarily
4. Try from different network (phone hotspot?)

---

## Advanced Troubleshooting

### View all API requests being made

```javascript
// In browser DevTools Console:
localStorage.setItem('debug', '*')
```

Then watch the Network tab for all API calls.

### Test Airtable API directly

```bash
# Replace TOKEN with your token
curl -H "Authorization: Bearer TOKEN" \
  https://api.airtable.com/v0/appIX01WbrAucX0u3/tblTRoCtQpFJzemGW

# Should return your exercise log records as JSON
```

### Check all user data stored locally

```javascript
// In DevTools Console:
JSON.parse(localStorage.getItem('user'))
```

Shows:
```json
{
  "id": "user_xxxxx",
  "email": "your@email.com",
  "password": "your_password"
}
```

---

## Getting More Help

1. **Check browser console** (F12)
   - Errors show here
   - Copy full error message

2. **Check Network tab** (F12 → Network)
   - See API requests
   - Check response status codes
   - Look for 400, 403, 429 errors

3. **Test API directly**
   - Use curl or Postman
   - Verify Airtable is responding

4. **Check Airtable directly**
   - Log in to Airtable.com
   - Verify base, tables, fields exist
   - Verify data is there

5. **Try another browser**
   - Firefox, Chrome, Safari
   - Rules out browser-specific issues

---

## Feature Requests / Bugs

Have an idea or found a bug?

**Current app limitations**:
- ❌ No multi-user data isolation (all users see all workouts)
- ❌ No edit/delete functionality
- ❌ No progress charts
- ❌ No personal records tracking
- ❌ No account deletion

**To add these**:
1. Edit `workout-app.jsx`
2. Add code for desired feature
3. Test locally (`npm start`)
4. Deploy to Netlify (`git push`)

---

## Changelog

### v1.0.0 (Current)
- ✅ User signup/login with localStorage
- ✅ Quick workout logging
- ✅ View today's workouts
- ✅ Airtable integration
- ✅ Mobile responsive UI
- ✅ Netlify deployment ready

---

Still stuck? 

1. Check SETUP_INSTRUCTIONS.md again
2. Verify all steps were followed
3. Try creating a brand new app from scratch
4. Compare your code with `workout-app.jsx` line by line

You've got this! 💪
