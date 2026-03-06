# GymTracker Architecture & Features

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           GymTracker React Web App                   │   │
│  │         (Running on netlify.app domain)              │   │
│  │                                                      │   │
│  │  ┌────────────────┐      ┌────────────────────┐     │   │
│  │  │  Login/Signup  │      │  Workout Logger    │     │   │
│  │  │  Page          │      │  (Quick Form)      │     │   │
│  │  └────────────────┘      └────────────────────┘     │   │
│  │         ↓                        ↓                   │   │
│  │  ┌────────────────┐      ┌────────────────────┐     │   │
│  │  │  Dashboard     │      │  Today's Workouts  │     │   │
│  │  │  (Home Page)   │      │  (Session View)    │     │   │
│  │  └────────────────┘      └────────────────────┘     │   │
│  │                                                      │   │
│  │  Uses localStorage for user session data            │   │
│  │  Makes API calls to Airtable                        │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                    (localStorage)                           │
│              User login & session data                      │
│                                                              │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ HTTP Requests
           │ (Airtable API)
           │
           ↓
┌────────────────────────────────────────────────────────────┐
│                  AIRTABLE BASE                             │
│              (Your Workout Tracker)                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌────────────────────────┐         │
│  │  Exercise Log    │  │  List of Exercises     │         │
│  │  Table           │  │  Table                 │         │
│  │                  │  │                        │         │
│  │  - Date          │  │  - Exercise Name       │         │
│  │  - Exercise (FK) │→→│  - Type                │         │
│  │  - Weight (kg)   │  │  - Primary Muscles     │         │
│  │  - Reps          │  │  - Secondary Muscles   │         │
│  │  - Sets          │  │                        │         │
│  │  - User Email*   │  │                        │         │
│  │                  │  │                        │         │
│  └──────────────────┘  └────────────────────────┘         │
│                                                            │
│  * Optional: Add "User Email" field for user isolation    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Current Flow

### 1. User Authentication
```
User → Signup Form → Store in localStorage
                  → Login Form → Load from localStorage
```

### 2. Logging a Workout
```
User fills form:
  Exercise: [Dropdown from Airtable]
  Weight: [Number input]
  Reps: [Number input]
  Sets: [Number input]
       ↓
  Click "Log Workout"
       ↓
  POST to Airtable API
       ↓
  New record created in Exercise Log table
       ↓
  Show success message
```

### 3. Viewing Today's Workouts
```
On page load / after logging:
  Fetch all records where Date = TODAY
       ↓
  Display list with exercise, weight, reps, sets
```

---

## App Features

### 🔐 Authentication
- ✅ Sign up with email/password
- ✅ Login with email/password
- ✅ Session persistence (survives page refresh)
- ✅ Logout functionality
- ⚠️ *Note: Currently stores in localStorage (demo). For production, use Firebase or backend*

### 🏋️ Workout Logging
- ✅ Select exercise from Airtable catalog
- ✅ Input weight (kg) - supports decimal (.5 increments)
- ✅ Input reps
- ✅ Input sets
- ✅ Auto-timestamps with today's date
- ✅ Form validation

### 📊 Dashboard
- ✅ Welcome message with user email
- ✅ Quick log form on left side
- ✅ Today's workouts on right side
- ✅ Mobile responsive layout
- ✅ Empty state message when no workouts

### 🎨 UI/UX
- ✅ Beautiful blue gradient theme
- ✅ Dark mode friendly
- ✅ Mobile responsive design
- ✅ Loading states on buttons
- ✅ Error messages
- ✅ Success feedback
- ✅ Icons for visual clarity

---

## Data Flow Diagram

```
┌─────────────┐
│   User      │
│   Signup    │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Create User in localStorage         │
│ {                                   │
│   id: "user_xxxxx",                │
│   email: "user@example.com",       │
│   password: "hashed_password"      │
│ }                                   │
└──────┬──────────────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ User Logged In               │
│ Navigate to Dashboard        │
└──────┬───────────────────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ↓                                     ↓
┌──────────────────────────┐        ┌──────────────────────────┐
│ Fetch Exercises from     │        │ Fetch Today's Workouts   │
│ Airtable                 │        │ from Airtable            │
│                          │        │                          │
│ GET /v0/BASE/EXERCISES   │        │ GET /v0/BASE/LOGS        │
│ Filter: Today's date     │        │ Filter: Today's date     │
│                          │        │                          │
│ ↓ Returns: [Exercise1,   │        │ ↓ Returns: [Workout1,    │
│            Exercise2,    │        │            Workout2, ...] │
│            ...]          │        │                          │
└──────┬───────────────────┘        └──────┬───────────────────┘
       │                                    │
       └────────────────┬───────────────────┘
                        │
                        ↓
                  ┌───────────────┐
                  │  Render UI    │
                  │ - Exercise    │
                  │   dropdown    │
                  │ - Weight input│
                  │ - Reps input  │
                  │ - Sets input  │
                  │ - Workout list│
                  └───────┬───────┘
                          │
                  ┌───────▼────────┐
                  │ User Fills Form │
                  │ Clicks "Log"    │
                  └───────┬────────┘
                          │
                          ↓
              ┌────────────────────────┐
              │ POST to Airtable       │
              │ Exercise Log Table      │
              │ {                       │
              │   Date: "2024-03-04",  │
              │   Exercise: [id],      │
              │   Weight: 50.5,        │
              │   Reps: 10,            │
              │   Sets: 3              │
              │ }                       │
              └────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │ Success?                    │
        │                             │
        ↓ Yes                    No ↓
    ┌────────────┐          ┌──────────────┐
    │ Clear form │          │ Show error   │
    │ Show ✓     │          │ message      │
    │ Refetch    │          │ Keep form    │
    │ workouts   │          │ filled       │
    └────────────┘          └──────────────┘
```

---

## What Happens Behind the Scenes

### When you click "Log Workout":

1. **Form Validation**
   - Checks all fields are filled
   - Shows error if empty

2. **API Request**
   ```javascript
   POST https://api.airtable.com/v0/appIX01WbrAucX0u3/tblTRoCtQpFJzemGW
   Headers: {
     Authorization: Bearer YOUR_TOKEN,
     Content-Type: application/json
   }
   Body: {
     records: [{
       fields: {
         Date: "2024-03-04",
         Excercise: ["rec123..."],
         Weight: 50.5,
         Reps: 10,
         Sets: 3
       }
     }]
   }
   ```

3. **Response Handling**
   - If 200 OK: Success! 
     - Clear form
     - Show success message (3 sec)
     - Refetch today's workouts
   - If error: Show error message

4. **Real-time Update**
   - Your new workout appears in "Today's Workouts" section
   - View it immediately in your Airtable base

---

## Security Notes (Current vs Production)

### Current Implementation (Demo)
- ✅ User credentials stored in localStorage (client-side)
- ✅ Airtable token exposed in frontend (public)
- ✅ No backend validation
- ✅ Good for: Personal use, testing, demo

### For Production with Multiple Users
- ❌ Don't store passwords in localStorage
- ❌ Hide Airtable token in backend
- ✅ Use Firebase/Auth0 for authentication
- ✅ Add backend API for permission checking
- ✅ Validate user owns workout before deletion
- ✅ Add rate limiting
- ✅ Use HTTPS everywhere

---

## Database Relations

```
┌──────────────────┐          ┌─────────────────────┐
│ List of Muscles  │          │ List of Exercises   │
├──────────────────┤          ├─────────────────────┤
│ Muscle (PK)      │          │ Exercise (PK)       │
│ Type             │      ┌───│ Type                │
│ List of Exer...  │──┐   │   │ Primary Muscle  ────│───┐
└──────────────────┘  │   │   │ Secondary Muscle ───│───┤
                      │   │   │ Primary Ratio       │   │
                      │   │   │ Secondary Ratio     │   │
                      │   │   └─────────────────────┘   │
                      │   │                             │
                      │   └──────────┬──────────────────┘
                      │              │
                      ↓              ↓
                  ┌────────────────────────┐
                  │ Exercise Log (YOUR DATA)│
                  ├────────────────────────┤
                  │ Date                   │
                  │ Exercise (FK) ─────────│→ List of Exercises
                  │ Weight (kg)            │
                  │ Reps                   │
                  │ Sets                   │
                  │ User Email (optional)  │
                  │ Training Phase (opt)   │
                  └────────────────────────┘

PK = Primary Key
FK = Foreign Key (links to another table)
```

---

## What's Next?

### Immediate Improvements
1. Add "User Email" field to Exercise Log in Airtable
2. Filter workouts to only show user's own
3. Deploy to Netlify

### Medium-term Features
- 📊 Progress charts (weight over time)
- 🎯 Personal records tracking
- 📅 Weekly summary view
- 🏆 Stats dashboard (total volume, PR by muscle group)

### Long-term Features
- 🤝 Share workouts with friends
- 👥 Team leaderboards
- 🤖 AI workout recommendations
- 📱 Native mobile app
- ⚡ Offline sync support
- 🎥 Form checking with AI
- 🍽️ Meal tracking integration

---

Enjoy tracking your gains! 💪🚀
