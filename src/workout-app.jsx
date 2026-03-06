import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Calendar, Zap, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, Dumbbell, Upload, Settings, MessageCircle, AlertCircle } from 'lucide-react';
import { signUp, signIn, signOut, onAuthChange, updateProfile, getProfile } from './lib/auth';
import * as api from './lib/api';

const WorkoutApp = () => {
  const [page, setPage] = useState('login'); // login, signup, dashboard
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [exercises, setExercises] = useState([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Edit/Delete state (Phase 1)
  const [editingSetId, setEditingSetId] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Dashboard sub-view (Phase 2)
  const [dashboardView, setDashboardView] = useState('main'); // 'main' | 'myWorkouts' | 'activeWorkout'

  // Workout templates (Phase 2)
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateExercises, setTemplateExercises] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);

  // Progressive overload (Phase 3)
  const [overloadDates, setOverloadDates] = useState(new Set());

  // Import Workouts state
  const [importText, setImportText] = useState('');
  const [importParsedEntries, setImportParsedEntries] = useState([]);
  const [importUnparseable, setImportUnparseable] = useState([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importStep, setImportStep] = useState('input'); // 'input' | 'preview' | 'importing' | 'done'
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResult, setImportResult] = useState(null);

  // WhatsApp Settings state
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappRegistering, setWhatsappRegistering] = useState(false);
  const [whatsappLinked, setWhatsappLinked] = useState(false);

  // ─── Auth ───────────────────────────────────────────────

  const handleSignup = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      await signUp(email, password);
      // Supabase Auth may require email confirmation depending on project settings.
      // If email confirmation is disabled, user is auto-logged in via onAuthChange.
      setSuccess('Account created! Check your email to confirm, or log in if confirmation is disabled.');
      setEmail('');
      setPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Signup failed');
    }
    setLoading(false);
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      // onAuthChange listener will handle setting user and page
      setEmail('');
      setPassword('');
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Login failed');
      }
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    // onAuthChange listener will handle clearing user and page
    setDashboardView('main');
    setActiveTemplate(null);
  };

  // ─── Data Fetching ────────────────────────────────────────

  const loadExercises = async () => {
    try {
      const data = await api.fetchExercises();
      setExercises(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
      setError('Could not load exercises');
      return [];
    }
  };

  const loadWorkoutDates = async () => {
    if (!user) return;
    setCalendarLoading(true);
    try {
      const dates = await api.fetchWorkoutDates(user.id);
      setWorkoutDates(dates);
    } catch (err) {
      console.error('Failed to fetch workout dates:', err);
    }
    setCalendarLoading(false);
  };

  const loadWorkoutsForDate = async (date) => {
    if (!user) return;
    try {
      const workouts = await api.fetchWorkoutsForDate(user.id, date);
      setSelectedDateWorkouts(workouts);
    } catch (err) {
      console.error('Failed to fetch workouts for date:', err);
    }
  };

  // ─── Log Set ────────────────────────────────────────────

  const logWorkout = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !weight || !reps) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const today = getLocalToday();
      await api.createWorkoutLog(
        user.id,
        selectedExercise,
        today,
        parseFloat(weight),
        parseInt(reps)
      );
      setSuccess('Set logged successfully!');
      setWeight('');
      setReps('');
      await loadWorkoutsForDate(selectedCalendarDate);
      await loadWorkoutDates();
      computeProgressiveOverload();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error logging set: ' + err.message);
    }
    setLoading(false);
  };

  // ─── Edit/Delete Sets (Phase 1) ─────────────────────────

  const startEditSet = (set) => {
    setEditingSetId(set.id);
    setEditWeight(String(set.weight));
    setEditReps(String(set.reps));
  };

  const cancelEdit = () => {
    setEditingSetId(null);
    setEditWeight('');
    setEditReps('');
  };

  const saveEditSet = async (recordId) => {
    if (!editWeight || !editReps) {
      setError('Weight and reps are required');
      return;
    }
    setLoading(true);
    try {
      await api.updateWorkoutLog(recordId, parseFloat(editWeight), parseInt(editReps));
      cancelEdit();
      await loadWorkoutsForDate(selectedCalendarDate);
      computeProgressiveOverload();
    } catch (err) {
      setError('Error updating set: ' + err.message);
    }
    setLoading(false);
  };

  const deleteWorkoutRecord = async (recordId) => {
    setLoading(true);
    try {
      await api.deleteWorkoutLog(recordId);
      setDeleteConfirmId(null);
      await loadWorkoutsForDate(selectedCalendarDate);
      await loadWorkoutDates();
      computeProgressiveOverload();
    } catch (err) {
      setError('Error deleting set: ' + err.message);
    }
    setLoading(false);
  };

  // ─── Workout Templates (Phase 2) ───────────────────────

  const loadTemplates = async () => {
    if (!user) return;
    try {
      const templates = await api.fetchTemplates(user.id);
      setWorkoutTemplates(templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const createTemplate = async () => {
    if (!templateName.trim() || templateExercises.length === 0) {
      setError('Template needs a name and at least one exercise');
      return;
    }
    try {
      await api.createTemplate(user.id, templateName.trim(), templateExercises);
      await loadTemplates();
      setTemplateName('');
      setTemplateExercises([]);
      setEditingTemplate(null);
      setError('');
    } catch (err) {
      setError('Error creating template: ' + err.message);
    }
  };

  const updateTemplate = async (templateId) => {
    if (!templateName.trim() || templateExercises.length === 0) {
      setError('Template needs a name and at least one exercise');
      return;
    }
    try {
      await api.updateTemplate(templateId, templateName.trim(), templateExercises);
      await loadTemplates();
      setTemplateName('');
      setTemplateExercises([]);
      setEditingTemplate(null);
      setError('');
    } catch (err) {
      setError('Error updating template: ' + err.message);
    }
  };

  const deleteTemplate = async (templateId) => {
    try {
      await api.deleteTemplate(templateId);
      await loadTemplates();
    } catch (err) {
      setError('Error deleting template: ' + err.message);
    }
  };

  const startActiveWorkout = (template) => {
    setActiveTemplate(template);
    setActiveExerciseIndex(0);
    setSelectedExercise(template.exerciseIds[0]);
    setWeight('');
    setReps('');
    setDashboardView('activeWorkout');
  };

  const advanceToNextExercise = () => {
    const nextIdx = activeExerciseIndex + 1;
    if (nextIdx < activeTemplate.exerciseIds.length) {
      setActiveExerciseIndex(nextIdx);
      setSelectedExercise(activeTemplate.exerciseIds[nextIdx]);
      setWeight('');
      setReps('');
    }
  };

  const finishActiveWorkout = () => {
    setActiveTemplate(null);
    setActiveExerciseIndex(0);
    setSelectedExercise('');
    setDashboardView('main');
  };

  // ─── Progressive Overload (Phase 3) ────────────────────

  const computeProgressiveOverload = async () => {
    if (!user) return;
    try {
      const allRecords = await api.fetchAllUserLogs(user.id);

      const byExercise = {};
      allRecords.forEach(r => {
        const exId = r.exercise_id;
        if (!exId) return;
        if (!byExercise[exId]) byExercise[exId] = [];
        byExercise[exId].push({
          date: r.date,
          weight: r.weight_kg || 0,
          reps: r.reps || 0
        });
      });

      const overloadSet = new Set();

      Object.values(byExercise).forEach(entries => {
        const sessions = {};
        entries.forEach(e => {
          if (!sessions[e.date]) sessions[e.date] = [];
          sessions[e.date].push(e);
        });
        const sessionDates = Object.keys(sessions).sort();

        for (let i = 1; i < sessionDates.length; i++) {
          const prevSets = sessions[sessionDates[i - 1]];
          const currSets = sessions[sessionDates[i]];
          const prevMaxWeight = Math.max(...prevSets.map(s => s.weight));
          const prevMaxRepsAtMax = Math.max(...prevSets.filter(s => s.weight === prevMaxWeight).map(s => s.reps));

          const hasOverload = currSets.some(s =>
            s.weight > prevMaxWeight ||
            (s.weight === prevMaxWeight && s.reps > prevMaxRepsAtMax)
          );
          if (hasOverload) overloadSet.add(sessionDates[i]);
        }
      });

      setOverloadDates(overloadSet);
    } catch (err) {
      console.error('Failed to compute progressive overload:', err);
    }
  };

  // ─── Import Previous Workouts ─────────────────────────

  const parseImportText = async () => {
    if (!importText.trim()) { setError('Please paste your workout notes'); return; }
    setImportParsing(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/parse-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, userEmail: user.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Parse failed');
      setImportParsedEntries(data.entries || []);
      setImportUnparseable(data.unparseable || []);
      setImportStep('preview');
    } catch (err) {
      setError('Failed to parse: ' + err.message);
    }
    setImportParsing(false);
  };

  const removeImportEntry = (index) => {
    setImportParsedEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateImportEntry = (index, field, value) => {
    setImportParsedEntries(prev => prev.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const executeImport = async () => {
    const validEntries = importParsedEntries.filter(e => e.matched && e.date !== 'UNKNOWN');
    if (validEntries.length === 0) { setError('No valid entries to import'); return; }
    setImportStep('importing');
    setImportProgress({ done: 0, total: validEntries.length });

    let created = 0;
    let errors = [];

    // Supabase supports larger bulk inserts, but we chunk at 50 for safety
    const CHUNK_SIZE = 50;
    for (let i = 0; i < validEntries.length; i += CHUNK_SIZE) {
      const chunk = validEntries.slice(i, i + CHUNK_SIZE);
      try {
        const records = chunk.map(entry => ({
          user_id: user.id,
          exercise_id: entry.exerciseId,
          date: entry.date,
          weight_kg: parseFloat(entry.weight),
          reps: parseInt(entry.reps),
          sets: 1,
        }));
        const result = await api.bulkCreateWorkoutLogs(records);
        created += result.length;
      } catch (err) {
        errors.push({ message: err.message });
      }
      setImportProgress({ done: Math.min(i + CHUNK_SIZE, validEntries.length), total: validEntries.length });
    }
    setImportResult({ created, errors: errors.length });
    setImportStep('done');
    await loadWorkoutDates();
    computeProgressiveOverload();
  };

  const resetImport = () => {
    setImportText('');
    setImportParsedEntries([]);
    setImportUnparseable([]);
    setImportStep('input');
    setImportResult(null);
    setImportProgress({ done: 0, total: 0 });
    setError('');
  };

  // ─── WhatsApp Registration ──────────────────────────

  const registerWhatsApp = async () => {
    if (!whatsappPhone.trim()) { setError('Please enter your WhatsApp phone number'); return; }
    setWhatsappRegistering(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/whatsapp-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappPhone, email: user.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      // Also update the profile in Supabase
      await updateProfile(user.id, { phone: whatsappPhone, whatsapp_linked: true });
      setWhatsappLinked(true);
      setSuccess('WhatsApp number linked successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Failed to link: ' + err.message);
    }
    setWhatsappRegistering(false);
  };

  // ─── Calendar Helpers ──────────────────────────────────

  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatDate = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getLocalToday = () => {
    const now = new Date();
    return formatDate(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const handleDateClick = async (dateStr) => {
    setSelectedCalendarDate(dateStr);
    setSelectedDateWorkouts([]);
    setEditingSetId(null);
    setDeleteConfirmId(null);
    if (workoutDates.has(dateStr)) {
      await loadWorkoutsForDate(dateStr);
    }
  };

  const prevMonth = () =>
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));

  const nextMonth = () =>
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  // ─── Derived: Group workouts by exercise ───────────────

  const groupedWorkouts = selectedDateWorkouts.reduce((groups, w) => {
    const key = w.exercise;
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
    return groups;
  }, {});

  // ─── Effects ───────────────────────────────────────────

  // Listen to Supabase Auth state changes (replaces localStorage session check)
  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      if (authUser) {
        setUser(authUser);
        setPage('dashboard');
      } else {
        setUser(null);
        setPage('login');
      }
    });
    return unsubscribe;
  }, []);

  // Initialize dashboard when user logs in
  useEffect(() => {
    if (page === 'dashboard' && user) {
      const today = getLocalToday();
      setSelectedCalendarDate(today);
      loadExercises().then(() => loadWorkoutsForDate(today));
      loadWorkoutDates().then(() => computeProgressiveOverload());
      loadTemplates();
      // Load profile data for WhatsApp status
      getProfile(user.id).then(profile => {
        if (profile?.whatsapp_linked) {
          setWhatsappLinked(true);
          setWhatsappPhone(profile.phone || '');
        }
      }).catch(() => {});
    }
  }, [page, user]);

  // ─── Shared Classes ────────────────────────────────────

  const inputClass = "w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition";
  const cardClass = "bg-gray-800 rounded-xl p-6 border border-gray-700";
  const btnPrimary = "w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg transition disabled:opacity-40";

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Login ────────────────────────────────────── */}
      {page === 'login' && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Zap className="w-12 h-12 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-bold mb-2">GymTracker</h1>
              <p className="text-gray-400">Track your strength journey</p>
            </div>
            <div className={cardClass}>
              <div className="mb-5">
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="mb-5">
                <input type="password" placeholder="Password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </div>
              {error && <div className="mb-4 p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
              <button onClick={() => handleLogin(email, password)} disabled={loading} className={btnPrimary}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="mt-6 text-center">
                <p className="text-gray-500 mb-3">Don't have an account?</p>
                <button onClick={() => { setPage('signup'); setError(''); setSuccess(''); }} className="text-yellow-400 hover:text-yellow-300 font-semibold transition">
                  Create account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Signup ───────────────────────────────────── */}
      {page === 'signup' && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Create Account</h1>
              <p className="text-gray-400">Join the fitness revolution</p>
            </div>
            <div className={cardClass}>
              <div className="mb-5">
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="mb-5">
                <input type="password" placeholder="Password (min 6 characters)" value={password}
                  onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </div>
              {error && <div className="mb-4 p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
              <button onClick={() => handleSignup(email, password)} disabled={loading} className={btnPrimary}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
              <div className="mt-6 text-center">
                <button onClick={() => { setPage('login'); setError(''); setSuccess(''); }} className="text-yellow-400 hover:text-yellow-300 font-semibold transition">
                  Back to login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dashboard ────────────────────────────────── */}
      {page === 'dashboard' && user && (
        <div className="min-h-screen p-4 md:p-8">
          {/* Header */}
          <div className="max-w-7xl mx-auto mb-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Welcome back!</h1>
                <p className="text-gray-400 mt-1">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {dashboardView !== 'activeWorkout' && (
                  <>
                    <button
                      onClick={() => { resetImport(); setDashboardView(dashboardView === 'importWorkouts' ? 'main' : 'importWorkouts'); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition border ${
                        dashboardView === 'importWorkouts'
                          ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                      }`}
                    >
                      <Upload className="w-5 h-5" />
                      Import
                    </button>
                    <button
                      onClick={() => setDashboardView(dashboardView === 'myWorkouts' ? 'main' : 'myWorkouts')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition border ${
                        dashboardView === 'myWorkouts'
                          ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                      }`}
                    >
                      <Dumbbell className="w-5 h-5" />
                      My Workouts
                    </button>
                    <button
                      onClick={() => setDashboardView(dashboardView === 'settings' ? 'main' : 'settings')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition border ${
                        dashboardView === 'settings'
                          ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </>
                )}
                {dashboardView === 'activeWorkout' && (
                  <button onClick={finishActiveWorkout}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg font-semibold transition">
                    <X className="w-5 h-5" /> End Workout
                  </button>
                )}
                <button onClick={logout}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-semibold transition">
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              </div>
            </div>
          </div>

          {/* ── My Workouts View ──────────────────────── */}
          {dashboardView === 'myWorkouts' && (
            <div className="max-w-3xl mx-auto">
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDashboardView('main')}
                      className="flex items-center gap-1 text-gray-400 hover:text-white transition text-sm">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <h2 className="text-xl font-bold">My Workout Templates</h2>
                  </div>
                  {!editingTemplate && (
                    <button
                      onClick={() => { setEditingTemplate({ id: null }); setTemplateName(''); setTemplateExercises([]); setError(''); }}
                      className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-lg transition">
                      <Plus className="w-4 h-4" /> New Template
                    </button>
                  )}
                </div>

                {/* Template create/edit form */}
                {editingTemplate && (
                  <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name (e.g. Push Day)" className={inputClass + ' mb-4'} />
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Add exercises:</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value && !templateExercises.includes(e.target.value)) {
                          setTemplateExercises([...templateExercises, e.target.value]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white mb-3 focus:outline-none focus:border-yellow-500"
                      defaultValue="">
                      <option value="" disabled>Select exercise to add...</option>
                      {exercises.filter(ex => !templateExercises.includes(ex.id)).map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                    {templateExercises.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {templateExercises.map((exId, idx) => {
                          const ex = exercises.find(e => e.id === exId);
                          return (
                            <div key={exId} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg">
                              <span className="text-sm"><span className="text-gray-500 mr-2">{idx + 1}.</span>{ex?.name || 'Unknown'}</span>
                              <button onClick={() => setTemplateExercises(templateExercises.filter(id => id !== exId))}
                                className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {error && <div className="mb-3 p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
                    <div className="flex gap-2">
                      <button onClick={() => editingTemplate.id ? updateTemplate(editingTemplate.id) : createTemplate()}
                        className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-lg transition">
                        {editingTemplate.id ? 'Update' : 'Create'}
                      </button>
                      <button onClick={() => { setEditingTemplate(null); setError(''); }}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Template list */}
                {workoutTemplates.length === 0 && !editingTemplate ? (
                  <p className="text-gray-500 text-center py-8">No templates yet. Create one to get started!</p>
                ) : (
                  <div className="space-y-3">
                    {workoutTemplates.map(template => (
                      <div key={template.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <div className="flex items-center gap-2">
                            <button onClick={() => startActiveWorkout(template)}
                              className="bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1.5 rounded-lg transition font-semibold">
                              Start
                            </button>
                            <button onClick={() => {
                              setEditingTemplate(template);
                              setTemplateName(template.name);
                              setTemplateExercises([...template.exerciseIds]);
                              setError('');
                            }} className="p-1.5 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteTemplate(template.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {template.exerciseIds.map(id => exercises.find(e => e.id === id)?.name || 'Unknown').join(' \u2022 ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Active Workout View ───────────────────── */}
          {dashboardView === 'activeWorkout' && activeTemplate && (
            <div className="max-w-2xl mx-auto">
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-yellow-400">{activeTemplate.name}</h2>
                  <span className="text-sm text-gray-500">
                    {activeExerciseIndex + 1} / {activeTemplate.exerciseIds.length}
                  </span>
                </div>

                {/* Exercise progress pills */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  {activeTemplate.exerciseIds.map((exId, idx) => (
                    <button key={exId}
                      onClick={() => { setActiveExerciseIndex(idx); setSelectedExercise(exId); setWeight(''); setReps(''); }}
                      className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
                        idx === activeExerciseIndex
                          ? 'bg-yellow-500 text-gray-900'
                          : idx < activeExerciseIndex
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                      }`}>
                      {exercises.find(e => e.id === exId)?.name || 'Unknown'}
                    </button>
                  ))}
                </div>

                {/* Log form */}
                <form onSubmit={logWorkout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Current Exercise</label>
                    <div className="px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white font-semibold">
                      {exercises.find(e => e.id === activeTemplate.exerciseIds[activeExerciseIndex])?.name || 'Unknown'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Weight (kg)</label>
                      <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)}
                        placeholder="50" className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Reps</label>
                      <input type="number" value={reps} onChange={(e) => setReps(e.target.value)}
                        placeholder="10" className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                    </div>
                  </div>
                  {error && <div className="p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
                  {success && <div className="p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={loading}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg transition disabled:opacity-40">
                      {loading ? 'Logging...' : 'Log Set'}
                    </button>
                    {activeExerciseIndex < activeTemplate.exerciseIds.length - 1 && (
                      <button type="button" onClick={advanceToNextExercise}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition font-semibold flex items-center gap-1">
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Import Workouts View ─────────────────── */}
          {dashboardView === 'importWorkouts' && (
            <div className="max-w-4xl mx-auto">
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Upload className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-xl font-bold">Import Previous Workouts</h2>
                  </div>
                  <button onClick={() => { resetImport(); setDashboardView('main'); }}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition text-sm">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                </div>

                {/* Step 1: Input */}
                {importStep === 'input' && (
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">Paste your workout notes below. Our AI will parse dates, exercises, weights, and reps automatically.</p>
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      rows={10}
                      placeholder={"Example:\nMarch 3, 2026\nPullups 80kg 3x10\nFace pulls 25kg 3x15\n\nMarch 1, 2026\nBench press 60kg 4x8\nTricep pushdown 30kg 3x12"}
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition font-mono text-sm resize-y"
                    />
                    {error && <div className="p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
                    <button
                      onClick={parseImportText}
                      disabled={importParsing || !importText.trim()}
                      className={btnPrimary + ' flex items-center justify-center gap-2'}
                    >
                      {importParsing ? (
                        <><span className="animate-spin">⏳</span> Parsing with AI...</>
                      ) : (
                        <><Zap className="w-5 h-5" /> Parse with AI</>
                      )}
                    </button>
                  </div>
                )}

                {/* Step 2: Preview */}
                {importStep === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm">
                        Found <span className="text-white font-bold">{importParsedEntries.length}</span> entries.
                        {importParsedEntries.filter(e => !e.matched).length > 0 && (
                          <span className="text-red-400 ml-2">
                            ({importParsedEntries.filter(e => !e.matched).length} unmatched)
                          </span>
                        )}
                      </p>
                      <button onClick={() => { setImportStep('input'); setError(''); }} className="text-gray-400 hover:text-white text-sm underline">
                        ← Back to edit
                      </button>
                    </div>

                    {importUnparseable.length > 0 && (
                      <div className="p-3 bg-yellow-500 bg-opacity-10 border border-yellow-600 rounded-lg text-yellow-300 text-sm">
                        <strong>Could not parse:</strong>
                        {importUnparseable.map((line, i) => <div key={i} className="mt-1 text-yellow-400">• {line}</div>)}
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2 px-2">Date</th>
                            <th className="text-left py-2 px-2">Exercise</th>
                            <th className="text-left py-2 px-2">Weight</th>
                            <th className="text-left py-2 px-2">Reps</th>
                            <th className="py-2 px-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {importParsedEntries.map((entry, idx) => (
                            <tr key={idx} className={`border-b border-gray-700/50 ${!entry.matched ? 'bg-red-900/20' : ''} ${entry.needsReview ? 'bg-yellow-900/20' : ''}`}>
                              <td className="py-2 px-2">
                                <input type="date" value={entry.date !== 'UNKNOWN' ? entry.date : ''}
                                  onChange={e => updateImportEntry(idx, 'date', e.target.value)}
                                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs w-36 focus:outline-none focus:border-yellow-500" />
                              </td>
                              <td className="py-2 px-2">
                                {entry.matched ? (
                                  <span className="text-green-400">{entry.exercise}</span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {entry.exercise || entry.originalText}
                                  </span>
                                )}
                                {entry.fuzzyMatch && <span className="text-yellow-500 text-xs ml-1">(fuzzy)</span>}
                              </td>
                              <td className="py-2 px-2">
                                <input type="number" step="0.5" value={entry.weight}
                                  onChange={e => updateImportEntry(idx, 'weight', parseFloat(e.target.value) || 0)}
                                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs w-20 focus:outline-none focus:border-yellow-500" />
                              </td>
                              <td className="py-2 px-2">
                                <input type="number" value={entry.reps}
                                  onChange={e => updateImportEntry(idx, 'reps', parseInt(e.target.value) || 0)}
                                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs w-16 focus:outline-none focus:border-yellow-500" />
                              </td>
                              <td className="py-2 px-2">
                                <button onClick={() => removeImportEntry(idx)} className="text-gray-500 hover:text-red-400 transition">
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {error && <div className="p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}

                    <div className="flex gap-3">
                      <button
                        onClick={executeImport}
                        disabled={importParsedEntries.filter(e => e.matched && e.date !== 'UNKNOWN').length === 0}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-40"
                      >
                        Import {importParsedEntries.filter(e => e.matched && e.date !== 'UNKNOWN').length} Valid Entries
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Importing */}
                {importStep === 'importing' && (
                  <div className="space-y-4 text-center py-8">
                    <div className="text-4xl animate-pulse">⏳</div>
                    <p className="text-gray-300">Importing workouts...</p>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-gray-400 text-sm">{importProgress.done} of {importProgress.total} records</p>
                  </div>
                )}

                {/* Step 4: Done */}
                {importStep === 'done' && importResult && (
                  <div className="space-y-4 text-center py-8">
                    <div className="text-5xl">✅</div>
                    <h3 className="text-xl font-bold text-green-400">Import Complete!</h3>
                    <p className="text-gray-300">
                      Successfully imported <span className="text-white font-bold">{importResult.created}</span> workout records.
                    </p>
                    {importResult.errors > 0 && (
                      <p className="text-red-400 text-sm">{importResult.errors} batch(es) had errors.</p>
                    )}
                    <button onClick={() => { resetImport(); setDashboardView('main'); }} className={btnPrimary}>
                      Back to Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Settings View ──────────────────────────── */}
          {dashboardView === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* WhatsApp Integration */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold">WhatsApp Integration</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Link your WhatsApp number to log workouts by sending a message. Just text your workout details and they'll be automatically added to your tracker.
                </p>

                {whatsappLinked ? (
                  <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-green-400 font-semibold mb-2">✓ WhatsApp linked: {whatsappPhone}</p>
                    <p className="text-gray-400 text-sm">Send messages like:</p>
                    <div className="mt-2 bg-gray-900 rounded-lg p-3 text-sm font-mono text-gray-300">
                      <div>Pullups 80kg 3x10</div>
                      <div>Face pulls 25kg 3x15</div>
                      <div>March 5, 2026</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">WhatsApp Phone Number</label>
                      <input
                        type="tel"
                        value={whatsappPhone}
                        onChange={e => setWhatsappPhone(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition"
                      />
                      <p className="text-gray-500 text-xs mt-1">Include country code (e.g., +1 for US, +44 for UK)</p>
                    </div>
                    {error && <div className="p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
                    {success && <div className="p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
                    <button
                      onClick={registerWhatsApp}
                      disabled={whatsappRegistering || !whatsappPhone.trim()}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {whatsappRegistering ? 'Linking...' : <><MessageCircle className="w-5 h-5" /> Link Phone Number</>}
                    </button>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className={cardClass}>
                <h3 className="font-bold mb-3">How WhatsApp Logging Works</h3>
                <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                  <li>Link your phone number above</li>
                  <li>Save the bot's WhatsApp number to your contacts</li>
                  <li>Send a message with your workout details</li>
                  <li>The bot parses your exercises, weights, and reps using AI</li>
                  <li>Your workout is logged and you get a confirmation reply</li>
                </ol>
                <div className="mt-4 p-3 bg-gray-900 rounded-lg text-sm">
                  <p className="text-gray-400 mb-1">Example message:</p>
                  <p className="text-white font-mono text-xs">
                    March 5<br/>
                    Pullups 80kg 3x10<br/>
                    Face pulls 25kg 3x15<br/>
                    Incline bench 60kg 4x8
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Dashboard View (3-panel) ─────────── */}
          {dashboardView === 'main' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Panel 1: Log Set Form */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-6">
                  <Plus className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-xl font-bold">Log Set</h2>
                </div>
                <form onSubmit={logWorkout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Muscle Group</label>
                    <select value={selectedMuscleGroup} onChange={(e) => { setSelectedMuscleGroup(e.target.value); setSelectedExercise(''); }}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-yellow-500 transition">
                      <option value="">Select muscle group...</option>
                      {[...new Set(exercises.map(ex => ex.primary_muscle))].sort().map(mg => (
                        <option key={mg} value={mg}>{mg.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Exercise</label>
                    <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}
                      disabled={!selectedMuscleGroup}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-yellow-500 transition disabled:opacity-50">
                      <option value="">{selectedMuscleGroup ? 'Select exercise...' : 'Select a muscle group first...'}</option>
                      {exercises.filter(ex => ex.primary_muscle === selectedMuscleGroup).map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Weight (kg)</label>
                      <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)}
                        placeholder="50" className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Reps</label>
                      <input type="number" value={reps} onChange={(e) => setReps(e.target.value)}
                        placeholder="10" className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                    </div>
                  </div>
                  {error && <div className="p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
                  {success && <div className="p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? 'Logging...' : 'Log Set'}
                  </button>
                </form>
              </div>

              {/* Panel 2: Calendar Grid */}
              <div className={`md:col-span-1 lg:col-span-2 ${cardClass}`}>
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold">
                    {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                  </h2>
                  <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
                  ))}
                </div>
                {calendarLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = formatDate(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                      const hasWorkout = workoutDates.has(dateStr);
                      const hasOverload = overloadDates.has(dateStr);
                      const isSelected = selectedCalendarDate === dateStr;
                      const isToday = dateStr === getLocalToday();

                      return (
                        <button key={day} onClick={() => handleDateClick(dateStr)}
                          className={`
                            aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition
                            ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-800' : ''}
                            ${hasWorkout
                              ? hasOverload
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold'
                                : 'bg-green-600 hover:bg-green-500 text-white'
                              : isToday
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'hover:bg-gray-700 text-gray-300'}
                          `}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Legend */}
                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-700 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 rounded bg-green-600" /> Workout
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 rounded bg-yellow-500" /> Overload
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 rounded ring-2 ring-yellow-400 bg-gray-800" /> Selected
                  </div>
                </div>
              </div>

              {/* Panel 3: Day Detail (grouped by exercise with edit/delete) */}
              <div className={`md:col-span-2 lg:col-span-1 ${cardClass}`}>
                {!selectedCalendarDate ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Select a date to view sets</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-lg mb-1">
                      {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </h3>

                    {!workoutDates.has(selectedCalendarDate) && selectedDateWorkouts.length === 0 ? (
                      <div className="mt-6 text-center py-8">
                        <p className="text-gray-500">No workout on this day</p>
                      </div>
                    ) : selectedDateWorkouts.length === 0 ? (
                      <div className="mt-6 text-center py-8 text-gray-500">Loading...</div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {Object.entries(groupedWorkouts).map(([exerciseName, sets]) => (
                          <div key={exerciseName} className="bg-gray-900 rounded-lg border border-gray-700">
                            {/* Exercise header */}
                            <div className="px-4 py-3 border-b border-gray-700">
                              <p className="font-semibold text-sm">
                                {exerciseName}
                                <span className="text-gray-400 ml-2 font-normal">
                                  ({sets.length} {sets.length === 1 ? 'set' : 'sets'})
                                </span>
                              </p>
                            </div>
                            {/* Individual sets */}
                            <div className="divide-y divide-gray-800">
                              {sets.map((set, idx) => (
                                <div key={set.id} className="px-4 py-2.5 flex items-center justify-between">
                                  {editingSetId === set.id ? (
                                    /* Edit mode */
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="text-xs text-gray-600 font-mono w-8">S{idx + 1}</span>
                                      <input type="number" step="0.5" value={editWeight}
                                        onChange={(e) => setEditWeight(e.target.value)}
                                        className="w-16 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-yellow-500"
                                        placeholder="kg" />
                                      <span className="text-gray-500 text-xs">kg x</span>
                                      <input type="number" value={editReps}
                                        onChange={(e) => setEditReps(e.target.value)}
                                        className="w-14 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-yellow-500"
                                        placeholder="reps" />
                                      <button onClick={() => saveEditSet(set.id)} disabled={loading}
                                        className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                                      <button onClick={cancelEdit}
                                        className="p-1 text-gray-400 hover:text-gray-300"><X className="w-4 h-4" /></button>
                                    </div>
                                  ) : (
                                    /* Display mode */
                                    <>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-600 font-mono w-8">S{idx + 1}</span>
                                        <span className="text-sm text-gray-300">
                                          {set.weight}kg x {set.reps} reps
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {deleteConfirmId === set.id ? (
                                          <>
                                            <span className="text-xs text-red-400 mr-1">Delete?</span>
                                            <button onClick={() => deleteWorkoutRecord(set.id)} disabled={loading}
                                              className="p-1 text-red-400 hover:text-red-300"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteConfirmId(null)}
                                              className="p-1 text-gray-400 hover:text-gray-300"><X className="w-4 h-4" /></button>
                                          </>
                                        ) : (
                                          <>
                                            <button onClick={() => startEditSet(set)}
                                              className="p-1 text-gray-500 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setDeleteConfirmId(set.id)}
                                              className="p-1 text-gray-500 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutApp;
