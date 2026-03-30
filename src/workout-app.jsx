import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Plus, Calendar, Zap, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, Dumbbell, Upload, Settings, Hash, Slack, TrendingUp, AlertCircle } from 'lucide-react';
import { signUp, signIn, signOut, onAuthChange, sendPasswordReset, updatePassword, updateProfile, getProfile } from './lib/auth';
import * as api from './lib/api';
import { parseWorkoutWithGemini, parseProteinWithGemini } from './lib/gemini-parser';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = [
  '#eab308', // yellow
  '#60a5fa', // blue
  '#34d399', // green
  '#f472b6', // pink
  '#a78bfa', // purple
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#f87171', // red
  '#94a3b8', // slate
  '#facc15', // amber
];

const WorkoutApp = () => {
  const [page, setPage] = useState('login'); // login, signup, forgotPassword, resetPassword, dashboard
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

  // Slack Settings state
  const [slackUserId, setSlackUserId] = useState('');
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackLinked, setSlackLinked] = useState(false);

  // Protein Logging state
  const [proteinInput, setProteinInput] = useState('');
  const [proteinParsing, setProteinParsing] = useState(false);
  const [proteinLogs, setProteinLogs] = useState([]);
  const [editingProteinId, setEditingProteinId] = useState(null);
  const [editProteinDesc, setEditProteinDesc] = useState('');
  const [editProteinGrams, setEditProteinGrams] = useState('');
  const [deleteProteinConfirmId, setDeleteProteinConfirmId] = useState(null);

  // Smart defaults: last used weight/reps per exercise
  const [lastUsedWeights, setLastUsedWeights] = useState({});

  // Exercise search state
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  // Template exercise search state
  const [templateExerciseSearch, setTemplateExerciseSearch] = useState('');
  const [showTemplateExerciseDropdown, setShowTemplateExerciseDropdown] = useState(false);

  // Add new exercise state
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('');

  // Streak
  const [streak, setStreak] = useState(0);

  // Rest timer
  const [restTimer, setRestTimer] = useState(null);
  const [restTimerInterval, setRestTimerInterval] = useState(null);
  const [restDuration, setRestDuration] = useState(90);

  // PR celebration
  const [prMap, setPrMap] = useState({});
  const [prCelebration, setPrCelebration] = useState(null);

  // Overload cache for performance
  const overloadCacheRef = useRef(null);
  const overloadDebounceRef = useRef(null);

  // Active workout sets tracking
  const [activeWorkoutSetsLogged, setActiveWorkoutSetsLogged] = useState({});

  // Weekly summary
  const [weeklySummary, setWeeklySummary] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Last workout info (for repeat)
  const [lastWorkoutInfo, setLastWorkoutInfo] = useState(null);

  // Mobile panel tab
  const [mobilePanelTab, setMobilePanelTab] = useState('calendar');

  // Double progression recommendations
  const [doubleProgressionRecs, setDoubleProgressionRecs] = useState({});
  const DOUBLE_PROGRESSION_THRESHOLD = 16;

  // Weight stacks for AMRAP equivalence
  const [weightStacks, setWeightStacks] = useState({});
  const [weightCalcExpanded, setWeightCalcExpanded] = useState(false);
  const [weightStackExerciseSearch, setWeightStackExerciseSearch] = useState('');
  const [weightStackInput, setWeightStackInput] = useState('');

  // Template progression expansion
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);

  // ─── Mesocycle State ───────────────────────────────────
  const [activeMeso, setActiveMeso] = useState(null);
  // { id, name, num_weeks, start_date, rir_schedule: number[], status }
  const [mesoSchedule, setMesoScheduleState] = useState([]);
  // [{ day_of_week: 0-6, template_id: UUID }]
  const [mesoSetupStep, setMesoSetupStep] = useState(null);
  // null | 'config' | 'split' | 'week1'
  const [mesoName, setMesoName] = useState('');
  const [mesoNumWeeks, setMesoNumWeeks] = useState(8);
  const [mesoStartDate, setMesoStartDate] = useState('');
  const [mesoDraftSchedule, setMesoDraftSchedule] = useState({});
  // { [dayOfWeek]: templateId | 'rest' }
  const [mesoWeek1Weights, setMesoWeek1Weights] = useState({});
  // { [exerciseId]: { weight: string, reps: string } }
  const [mesoExerciseTargets, setMesoExerciseTargets] = useState({});
  // { [exerciseId]: { targetWeight, targetReps, rirTarget } }
  const [setStatusLog, setSetStatusLog] = useState([]);
  // [{ exerciseId, setNum, status: 'met'|'exceeded'|'missed' }]
  const [mesoSaving, setMesoSaving] = useState(false);
  const [allMesocycles, setAllMesocycles] = useState([]);

  // Progress Report state
  const [progressAllLogs, setProgressAllLogs] = useState([]);
  const [progressMode, setProgressMode] = useState('big6'); // 'big6' | 'muscleGroup' | 'workout' | 'search'
  const [progressMuscleGroup, setProgressMuscleGroup] = useState('');
  const [progressWorkoutId, setProgressWorkoutId] = useState('');
  const [progressSearch, setProgressSearch] = useState('');
  const [progressCustomIds, setProgressCustomIds] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);

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

  const handleForgotPassword = async (email) => {
    setLoading(true);
    setError('');
    try {
      await sendPasswordReset(email);
      setSuccess('Password reset email sent! Check your inbox.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    }
    setLoading(false);
  };

  const handleResetPassword = async (newPassword) => {
    setLoading(true);
    setError('');
    try {
      await updatePassword(newPassword);
      setSuccess('Password updated! Redirecting to login…');
      setNewPassword('');
      setTimeout(() => { setPage('login'); setSuccess(''); }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password');
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
      return dates;
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
      showToast('error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');

    const today = getLocalToday();
    const newWeight = parseFloat(weight);
    const newReps = parseInt(reps);
    const exName = exercises.find(e => e.id === selectedExercise)?.name || 'Exercise';

    // ── Optimistic updates (instant) ──
    const optimisticId = 'optimistic-' + Date.now();
    if (selectedCalendarDate === today) {
      setSelectedDateWorkouts(prev => [...prev, {
        id: optimisticId,
        exercise: exName,
        exerciseId: selectedExercise,
        weight: newWeight,
        reps: newReps,
        sets: 1,
      }]);
    }
    setWorkoutDates(prev => new Set([...prev, today]));
    updateOverloadIncremental(selectedExercise, today, newWeight, newReps);
    // Recompute double progression from updated cache
    if (overloadCacheRef.current) computeDoubleProgression(overloadCacheRef.current);
    setLastUsedWeights(prev => ({ ...prev, [selectedExercise]: { weight: newWeight, reps: newReps } }));
    setWeight('');
    setReps('');
    startRestTimer(restDuration);
    if (navigator.vibrate && !prCelebration) navigator.vibrate([50]);

    // Active workout: track sets logged and auto-advance
    if (activeTemplate) {
      const currentExId = selectedExercise;
      setActiveWorkoutSetsLogged(prev => {
        const logged = (prev[currentExId] || 0) + 1;
        const targetSets = activeTemplate.exercises?.[activeExerciseIndex]?.sets || 3;
        if (logged >= targetSets && activeExerciseIndex < activeTemplate.exerciseIds.length - 1) {
          setTimeout(() => advanceToNextExercise(), 500);
        }
        return { ...prev, [currentExId]: logged };
      });
    }

    // Meso: compute set status and record it
    const mesoTarget = activeMeso ? mesoExerciseTargets[selectedExercise] : null;
    const setStatus = determineSetStatus(newWeight, newReps, mesoTarget);
    if (setStatus) {
      const setNum = (activeWorkoutSetsLogged[selectedExercise] || 0) + 1;
      setSetStatusLog(prev => [...prev, { exerciseId: selectedExercise, setNum, status: setStatus }]);
    }

    // ── Server sync (background) ──
    const mesoWeekNum = activeMeso ? computeCurrentMesoWeek(activeMeso) : null;
    try {
      const result = await api.createWorkoutLog(user.id, selectedExercise, today, newWeight, newReps, {
        targetWeight: mesoTarget?.targetWeight,
        targetReps: mesoTarget?.targetReps,
        rirTarget: mesoTarget?.rirTarget,
        setStatus,
        mesoWeek: mesoWeekNum,
      });

      // PR detection
      const new1RM = compute1RM(newWeight, newReps);
      const prev = prMap[selectedExercise];
      if (prev) {
        if (newWeight > prev.maxWeight) {
          setPrCelebration({ exerciseName: exName, weight: newWeight, reps: newReps, type: 'weight' });
          setTimeout(() => setPrCelebration(null), 5000);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else if (new1RM && new1RM > prev.max1RM) {
          setPrCelebration({ exerciseName: exName, weight: newWeight, reps: newReps, type: '1rm', value: Math.round(new1RM) });
          setTimeout(() => setPrCelebration(null), 5000);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
        setPrMap(m => ({
          ...m,
          [selectedExercise]: {
            maxWeight: Math.max(m[selectedExercise]?.maxWeight || 0, newWeight),
            max1RM: Math.max(m[selectedExercise]?.max1RM || 0, new1RM || 0),
          }
        }));
      }

      // Replace optimistic record with real ID
      if (selectedCalendarDate === today) {
        setSelectedDateWorkouts(prev =>
          prev.map(w => w.id === optimisticId ? { ...w, id: result.id } : w)
        );
      }

      // Background: accurate dates for streak
      const dates = await api.fetchWorkoutDates(user.id);
      setWorkoutDates(dates);
      setStreak(computeStreak(dates));

      // Toast with undo
      const recordId = result.id;
      showToast('success', `${exName}: ${newWeight}kg x ${newReps}`, async () => {
        await api.deleteWorkoutLog(recordId);
        await loadWorkoutsForDate(selectedCalendarDate);
        const d = await api.fetchWorkoutDates(user.id);
        setWorkoutDates(d);
        debouncedOverloadRecompute();
        setStreak(computeStreak(d));
        showToast('success', 'Set undone');
      });
    } catch (err) {
      // Rollback optimistic update on error
      if (selectedCalendarDate === today) {
        setSelectedDateWorkouts(prev => prev.filter(w => w.id !== optimisticId));
      }
      showToast('error', 'Error logging set: ' + err.message);
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
      debouncedOverloadRecompute();
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
      debouncedOverloadRecompute();
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

  const addNewExercise = async () => {
    if (!newExerciseName.trim()) {
      setError('Exercise name is required');
      return;
    }
    const exists = exercises.find(
      ex => ex.name.toLowerCase() === newExerciseName.trim().toLowerCase()
    );
    if (exists) {
      setError('Exercise already exists');
      return;
    }
    try {
      const newEx = await api.createExercise(user.id, newExerciseName.trim(), newExerciseMuscle || null);
      setExercises(prev => [...prev, newEx].sort((a, b) => a.name.localeCompare(b.name)));
      if (editingTemplate) {
        setTemplateExercises(prev => [...prev, { exerciseId: newEx.id, sets: 3 }]);
      }
      setNewExerciseName('');
      setNewExerciseMuscle('');
      setShowAddExercise(false);
      setError('');
      showToast('success', `Added "${newEx.name}"`);
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setError('An exercise with this name already exists');
      } else {
        setError('Error adding exercise: ' + err.message);
      }
    }
  };

  const startActiveWorkout = (template) => {
    setActiveTemplate(template);
    setActiveExerciseIndex(0);
    setSelectedExercise(template.exerciseIds[0]);
    setWeight('');
    setReps('');
    setActiveWorkoutSetsLogged({});
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
    setActiveWorkoutSetsLogged({});
    setDashboardView('main');
  };

  // ─── Progressive Overload (Phase 3) ────────────────────

  const computeOverloadFromRecords = (allRecords) => {
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
    return overloadSet;
  };

  const computeProgressiveOverload = async () => {
    if (!user) return;
    try {
      const allRecords = await api.fetchAllUserLogs(user.id);
      overloadCacheRef.current = allRecords;
      setOverloadDates(computeOverloadFromRecords(allRecords));
    } catch (err) {
      console.error('Failed to compute progressive overload:', err);
    }
  };

  const updateOverloadIncremental = (exerciseId, date, weightKg, reps) => {
    if (!overloadCacheRef.current) return;
    const newRecord = { exercise_id: exerciseId, date, weight_kg: weightKg, reps };
    overloadCacheRef.current = [...overloadCacheRef.current, newRecord];
    setOverloadDates(computeOverloadFromRecords(overloadCacheRef.current));
  };

  const debouncedOverloadRecompute = () => {
    if (overloadDebounceRef.current) clearTimeout(overloadDebounceRef.current);
    overloadDebounceRef.current = setTimeout(() => computeProgressiveOverload(), 2000);
  };

  // ─── Double Progression Model ──────────────────────────

  const computeDoubleProgression = (allRecords) => {
    if (!allRecords || allRecords.length === 0) return;
    const byExercise = {};
    allRecords.forEach(r => {
      if (!r.exercise_id) return;
      if (!byExercise[r.exercise_id]) byExercise[r.exercise_id] = [];
      byExercise[r.exercise_id].push(r);
    });

    const recs = {};
    Object.entries(byExercise).forEach(([exId, records]) => {
      // Group by date
      const byDate = {};
      records.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = [];
        byDate[r.date].push(r);
      });
      // Get most recent session
      const dates = Object.keys(byDate).sort();
      if (dates.length === 0) return;
      const latestDate = dates[dates.length - 1];
      const latestSets = byDate[latestDate];
      // Sort by created_at to find first set
      latestSets.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      const firstSet = latestSets[0];
      if (!firstSet || !firstSet.weight_kg || firstSet.weight_kg <= 0) return;
      if (firstSet.reps >= DOUBLE_PROGRESSION_THRESHOLD) {
        const newWeight = Math.ceil(firstSet.weight_kg * 1.05 * 2) / 2;
        recs[exId] = {
          reps: firstSet.reps,
          weight: firstSet.weight_kg,
          recommendedWeight: newWeight,
        };
      }
    });
    setDoubleProgressionRecs(recs);
  };

  // ─── Exercise Progression Timeline ────────────────────

  const getExerciseProgressionTimeline = (exerciseId) => {
    if (!overloadCacheRef.current) return [];
    const records = overloadCacheRef.current.filter(r => r.exercise_id === exerciseId);
    if (records.length === 0) return [];

    const byDate = {};
    records.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });
    const dates = Object.keys(byDate).sort();

    const timeline = [];
    for (let i = 0; i < dates.length; i++) {
      const sets = byDate[dates[i]];
      const maxWeight = Math.max(...sets.map(s => s.weight_kg || 0));
      const maxRepsAtMax = Math.max(...sets.filter(s => (s.weight_kg || 0) === maxWeight).map(s => s.reps || 0));

      let status = 'first';
      if (i > 0) {
        const prevSets = byDate[dates[i - 1]];
        const prevMaxWeight = Math.max(...prevSets.map(s => s.weight_kg || 0));
        const prevMaxRepsAtMax = Math.max(...prevSets.filter(s => (s.weight_kg || 0) === prevMaxWeight).map(s => s.reps || 0));

        if (maxWeight > prevMaxWeight || (maxWeight === prevMaxWeight && maxRepsAtMax > prevMaxRepsAtMax)) {
          status = 'improved';
        } else if (maxWeight === prevMaxWeight && maxRepsAtMax === prevMaxRepsAtMax) {
          status = 'maintained';
        } else {
          status = 'regressed';
        }
      }
      timeline.push({ date: dates[i], status, weight: maxWeight, reps: maxRepsAtMax });
    }
    return timeline.slice(-12);
  };

  // ─── Import Previous Workouts ─────────────────────────

  const parseImportText = async () => {
    if (!importText.trim()) { setError('Please paste your workout notes'); return; }
    setImportParsing(true);
    setError('');
    try {
      const exerciseNames = exercises.map(e => e.name);
      const parsed = await parseWorkoutWithGemini(importText, exerciseNames);

      // Match parsed exercise names to exercise IDs
      const entries = (parsed.entries || []).map(entry => {
        if (entry.exercise === 'UNMATCHED') {
          return { ...entry, exerciseId: null, matched: false };
        }
        const exact = exercises.find(e => e.name === entry.exercise);
        if (exact) {
          return { ...entry, exerciseId: exact.id, matched: true };
        }
        // Fuzzy fallback: case-insensitive partial match
        const lower = entry.exercise.toLowerCase();
        const fuzzy = exercises.find(
          e => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase())
        );
        if (fuzzy) {
          return { ...entry, exercise: fuzzy.name, exerciseId: fuzzy.id, matched: true, fuzzyMatch: true };
        }
        return { ...entry, exerciseId: null, matched: false };
      });

      setImportParsedEntries(entries);
      setImportUnparseable(parsed.unparseable || []);
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

  // ─── Slack Integration ───────────────────────────────

  const saveSlackSettings = async () => {
    if (!slackUserId.trim()) { setError('Please enter your Slack User ID'); return; }
    setSlackSaving(true);
    setError('');
    try {
      await updateProfile(user.id, { slack_user_id: slackUserId.trim() });
      setSlackLinked(true);
      setSuccess('Slack User ID saved! You can now use /gymlog in Slack.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    }
    setSlackSaving(false);
  };

  // ─── Protein Logging ─────────────────────────────────

  const loadProteinLogs = async (date) => {
    if (!user || !date) return;
    try {
      const logs = await api.fetchProteinLogsForDate(user.id, date);
      setProteinLogs(logs);
    } catch (err) {
      console.error('Failed to load protein logs:', err);
    }
  };

  const logProtein = async () => {
    if (!proteinInput.trim()) { setError('Please describe what you ate'); return; }
    setProteinParsing(true);
    setError('');
    try {
      const parsed = await parseProteinWithGemini(proteinInput);
      if (!parsed.entries || parsed.entries.length === 0) {
        setError('Could not parse any protein sources. Try again with more detail.');
        setProteinParsing(false);
        return;
      }
      const date = selectedCalendarDate || getLocalToday();
      await api.createProteinLogs(user.id, date, parsed.entries);
      setProteinInput('');
      await loadProteinLogs(date);
      setSuccess(`Logged ${parsed.entries.length} protein source${parsed.entries.length !== 1 ? 's' : ''}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error logging protein: ' + err.message);
    }
    setProteinParsing(false);
  };

  const startEditProtein = (entry) => {
    setEditingProteinId(entry.id);
    setEditProteinDesc(entry.description);
    setEditProteinGrams(String(entry.protein_grams));
  };

  const cancelEditProtein = () => {
    setEditingProteinId(null);
    setEditProteinDesc('');
    setEditProteinGrams('');
  };

  const saveEditProtein = async (id) => {
    if (!editProteinDesc.trim() || !editProteinGrams) { setError('Description and grams are required'); return; }
    try {
      await api.updateProteinLog(id, editProteinDesc.trim(), parseFloat(editProteinGrams));
      cancelEditProtein();
      await loadProteinLogs(selectedCalendarDate || getLocalToday());
    } catch (err) {
      setError('Error updating protein entry: ' + err.message);
    }
  };

  const deleteProteinEntry = async (id) => {
    try {
      await api.deleteProteinLog(id);
      setDeleteProteinConfirmId(null);
      await loadProteinLogs(selectedCalendarDate || getLocalToday());
    } catch (err) {
      setError('Error deleting protein entry: ' + err.message);
    }
  };

  // ─── Progress Report ──────────────────────────────────

  const loadProgressData = async () => {
    if (!user) return;
    setProgressLoading(true);
    try {
      const logs = await api.fetchAllUserLogs(user.id);
      setProgressAllLogs(logs);
    } catch (err) {
      console.error('Failed to load progress data:', err);
    }
    setProgressLoading(false);
  };

  const getBigSixIds = () => {
    const groups = [
      ['barbell squat', 'back squat', 'front squat', 'squat'],
      ['bench press', 'chest press'],
      ['deadlift'],
      ['pull-up', 'pull up', 'pullup', 'chin-up', 'chin up', 'chinup', 'lat pulldown'],
      ['bent-over row', 'barbell row', 'pendlay row', 'cable row', 'seated row', ' row'],
      ['overhead press', 'shoulder press', 'military press', 'ohp', 'standing press'],
    ];
    const found = [];
    groups.forEach(pats => {
      for (const pat of pats) {
        const ex = exercises.find(e => e.name.toLowerCase().includes(pat));
        if (ex && !found.includes(ex.id)) { found.push(ex.id); break; }
      }
    });
    return found;
  };

  const compute1RM = (weight, reps) => {
    if (!reps || reps <= 0 || reps > 30 || !weight || weight <= 0) return null;
    const d = 1.0278 - 0.0278 * reps;
    return d > 0 ? weight / d : null;
  };

  const computeEquivalentReps = (currentWeight, currentReps, targetWeight) => {
    const est1RM = compute1RM(currentWeight, currentReps);
    if (!est1RM || targetWeight >= est1RM || targetWeight <= 0) return null;
    const eqReps = Math.round((1 - targetWeight / est1RM) / 0.0278);
    return eqReps >= 1 && eqReps <= 30 ? eqReps : null;
  };

  // ─── Mesocycle Logic ──────────────────────────────────

  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const buildRirSchedule = (numWeeks) => {
    // Week 1 = 3 RIR (manual setup). Last = 0 (AMRAP). Second-to-last = 1. Rest = 2.
    const s = new Array(numWeeks).fill(2);
    s[0] = 3;
    s[numWeeks - 1] = 0;
    if (numWeeks >= 2) s[numWeeks - 2] = 1;
    return s;
  };

  const computeCurrentMesoWeek = (meso) => {
    if (!meso) return 1;
    const start = new Date(meso.start_date);
    const today = new Date();
    const diff = Math.floor((today - start) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(diff + 1, meso.num_weeks));
  };

  const computeWeeklyTarget = (exerciseId, currentWeek, meso, minReps = 10, maxReps = 15) => {
    if (!meso || currentWeek <= 1) return null;
    const rirSchedule = meso.rir_schedule;
    const mesoStart = new Date(meso.start_date);

    const prevWeekStart = new Date(mesoStart);
    prevWeekStart.setDate(mesoStart.getDate() + (currentWeek - 2) * 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
    const psStr = fmtDate(prevWeekStart);
    const peStr = fmtDate(prevWeekEnd);

    const prevLogs = (overloadCacheRef.current || []).filter(r =>
      r.exercise_id === exerciseId && r.date >= psStr && r.date <= peStr
    );
    if (!prevLogs.length) return null;

    const best = prevLogs.reduce((b, l) => {
      const orm = compute1RM(l.weight_kg, l.reps) || 0;
      return orm > (compute1RM(b.weight_kg, b.reps) || 0) ? l : b;
    }, prevLogs[0]);

    let targetWeight = best.weight_kg || 0;
    let targetReps = (best.reps || 0) + 1;

    if (targetReps > maxReps) {
      const nextWeight = Math.ceil(targetWeight * 1.025 * 2) / 2;
      const eqReps = computeEquivalentReps(targetWeight, targetReps, nextWeight);
      if (eqReps && eqReps >= 7) {
        targetWeight = nextWeight;
        targetReps = Math.max(7, eqReps);
      }
    }

    const rirTarget = rirSchedule[currentWeek - 1] ?? 2;
    return { targetWeight, targetReps: Math.min(targetReps, 28), rirTarget };
  };

  const determineSetStatus = (actualWeight, actualReps, target) => {
    if (!target) return null;
    const { targetWeight, targetReps } = target;
    if (actualWeight < targetWeight) return 'missed';
    if (actualReps >= targetReps + 2 || actualWeight > targetWeight) return 'exceeded';
    if (actualReps >= targetReps - 1) return 'met';
    return 'missed';
  };

  const computeNextWorkout = (meso, schedule, templates) => {
    if (!meso || !schedule || schedule.length === 0) return null;
    const todayDow = new Date().getDay();
    for (let i = 1; i <= 7; i++) {
      const day = (todayDow + i) % 7;
      const entry = schedule.find(s => s.day_of_week === day);
      if (entry?.template_id) {
        const template = (templates || workoutTemplates).find(t => t.id === entry.template_id);
        if (!template) continue;
        const d = new Date();
        d.setDate(d.getDate() + i);
        return { template, dayOffset: i, date: fmtDate(d) };
      }
    }
    return null;
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getNextMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const toMonday = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + toMonday);
    return fmtDate(d);
  };

  const startMesoWorkout = (template) => {
    const meso = activeMeso;
    if (meso) {
      const week = computeCurrentMesoWeek(meso);
      const targets = {};
      (template.exerciseIds || []).forEach(exId => {
        targets[exId] = computeWeeklyTarget(exId, week, meso);
      });
      setMesoExerciseTargets(targets);
      setSetStatusLog([]);
    } else {
      setMesoExerciseTargets({});
      setSetStatusLog([]);
    }
    setActiveTemplate(template);
    setActiveExerciseIndex(0);
    setSelectedExercise(template.exerciseIds[0]);
    const last = lastUsedWeights[template.exerciseIds[0]];
    setWeight(last ? String(last.weight) : '');
    setReps(last ? String(last.reps) : '');
    setActiveWorkoutSetsLogged({});
    setDashboardView('activeWorkout');
  };

  const saveMesocycle = async () => {
    if (!mesoName.trim()) { showToast('error', 'Enter a meso name'); return; }
    setMesoSaving(true);
    try {
      const rirSchedule = buildRirSchedule(mesoNumWeeks);
      const meso = await api.createMesocycle(user.id, mesoName.trim(), mesoNumWeeks, mesoStartDate || getNextMonday(), rirSchedule);
      const scheduleEntries = Object.entries(mesoDraftSchedule)
        .filter(([, val]) => val && val !== 'rest')
        .map(([dow, templateId]) => ({ day_of_week: parseInt(dow), template_id: templateId }));
      await api.setMesoSchedule(meso.id, scheduleEntries);
      setActiveMeso(meso);
      setMesoScheduleState(scheduleEntries);
      setMesoSetupStep(null);
      setMesoDraftSchedule({});
      setMesoName('');
      setMesoNumWeeks(8);
      showToast('success', `Mesocycle "${meso.name}" started!`);
      setDashboardView('main');
    } catch (err) {
      showToast('error', 'Failed to save mesocycle');
    } finally {
      setMesoSaving(false);
    }
  };

  const getMonthlyBest = (exerciseId) => {
    const byMonth = {};
    progressAllLogs
      .filter(l => l.exercise_id === exerciseId && l.reps > 0 && l.reps <= 30 && l.weight_kg > 0)
      .forEach(l => {
        const month = l.date.substring(0, 7);
        const oneRM = compute1RM(l.weight_kg, l.reps);
        if (oneRM && (!byMonth[month] || oneRM > byMonth[month])) byMonth[month] = oneRM;
      });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value }));
  };

  const getProgressExercises = () => {
    if (progressMode === 'big6') return getBigSixIds();
    if (progressMode === 'muscleGroup' && progressMuscleGroup) {
      const ids = exercises.filter(ex => ex.primary_muscle === progressMuscleGroup).map(ex => ex.id);
      const logged = new Set(progressAllLogs.map(l => l.exercise_id));
      return ids.filter(id => logged.has(id));
    }
    if (progressMode === 'workout' && progressWorkoutId) {
      return workoutTemplates.find(t => t.id === progressWorkoutId)?.exerciseIds || [];
    }
    if (progressMode === 'search') return progressCustomIds;
    return [];
  };

  const fmtMonth = (s) => {
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y, m] = s.split('-');
    return `${names[parseInt(m) - 1]} ${y}`;
  };

  // Build recharts-compatible dataset: [{ month: 'Jan 2024', 'Bench Press': 102.3, ... }, ...]
  const buildChartData = (displayIds) => {
    const allMonths = new Set();
    const byExercise = {};
    displayIds.forEach(exId => {
      byExercise[exId] = {};
      getMonthlyBest(exId).forEach(({ month, value }) => {
        allMonths.add(month);
        byExercise[exId][month] = Math.round(value * 10) / 10;
      });
    });
    return [...allMonths].sort().map(month => {
      const entry = { month: fmtMonth(month) };
      displayIds.forEach(exId => {
        const ex = exercises.find(e => e.id === exId);
        if (ex && byExercise[exId][month] !== undefined) entry[ex.name] = byExercise[exId][month];
      });
      return entry;
    });
  };

  // ─── Toast System ─────────────────────────────────────

  const showToast = (type, message, undoAction) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message, undoAction }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), undoAction ? 6000 : 4000);
  };

  // ─── Streak Computation ──────────────────────────────────

  const computeStreak = (dates) => {
    if (dates.size === 0) return 0;
    const sorted = [...dates].sort().reverse();
    const today = getLocalToday();
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`;
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let count = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1] + 'T00:00:00');
      const currDate = new Date(sorted[i] + 'T00:00:00');
      const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) count++;
      else break;
    }
    return count;
  };

  // ─── Rest Timer ──────────────────────────────────────────

  const startRestTimer = (seconds) => {
    if (restTimerInterval) clearInterval(restTimerInterval);
    setRestTimer({ remaining: seconds, total: seconds });
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (!prev || prev.remaining <= 1) {
          clearInterval(interval);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    setRestTimerInterval(interval);
  };

  const skipRestTimer = () => {
    if (restTimerInterval) clearInterval(restTimerInterval);
    setRestTimer(null);
  };

  // ─── PR Detection ────────────────────────────────────────

  const buildPrMap = (logs) => {
    const map = {};
    logs.forEach(l => {
      const orm = compute1RM(l.weight_kg, l.reps);
      if (!map[l.exercise_id]) map[l.exercise_id] = { maxWeight: 0, max1RM: 0 };
      if (l.weight_kg > map[l.exercise_id].maxWeight) map[l.exercise_id].maxWeight = l.weight_kg;
      if (orm && orm > map[l.exercise_id].max1RM) map[l.exercise_id].max1RM = orm;
    });
    return map;
  };

  // ─── Weekly Summary ──────────────────────────────────────

  const computeWeeklySummary = async () => {
    if (!user) return;
    const today = new Date();
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);

    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Compute 4 week boundaries
    const weekBounds = [];
    for (let w = 0; w < 4; w++) {
      const mon = new Date(thisMonday);
      mon.setDate(thisMonday.getDate() - w * 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const endDate = w === 0 ? today : sun;
      weekBounds.push({ start: fmt(mon), end: fmt(endDate), label: `W${4 - w}` });
    }

    try {
      const weekData = await Promise.all(
        weekBounds.map(wb => api.fetchLogsForDateRange(user.id, wb.start, wb.end))
      );
      const thisWeek = weekData[0];
      const lastWeek = weekData[1];
      const vol = logs => logs.reduce((s, l) => s + (l.weight_kg || 0) * (l.reps || 0), 0);

      // Volume by muscle group
      const volumeByMuscle = {};
      thisWeek.forEach(l => {
        const ex = exercises.find(e => e.id === l.exercise_id);
        const muscle = ex?.primary_muscle || 'other';
        const displayMuscle = muscle.replace(/_/g, ' ');
        volumeByMuscle[displayMuscle] = (volumeByMuscle[displayMuscle] || 0) + (l.weight_kg || 0) * (l.reps || 0);
      });
      Object.keys(volumeByMuscle).forEach(k => { volumeByMuscle[k] = Math.round(volumeByMuscle[k]); });

      // Overload count this week
      let overloadCount = 0;
      if (overloadCacheRef.current) {
        const thisWeekStart = weekBounds[0].start;
        const thisWeekEnd = weekBounds[0].end;
        const weekOverload = computeOverloadFromRecords(overloadCacheRef.current);
        const thisWeekDates = new Set(thisWeek.map(l => l.date));
        thisWeekDates.forEach(d => { if (weekOverload.has(d)) overloadCount++; });
      }

      // PR count this week
      let prCount = 0;
      const thisWeekExIds = [...new Set(thisWeek.map(l => l.exercise_id))];
      thisWeekExIds.forEach(exId => {
        const weekBest = thisWeek.filter(l => l.exercise_id === exId)
          .reduce((best, l) => {
            const orm = compute1RM(l.weight_kg, l.reps);
            return orm && orm > best ? orm : best;
          }, 0);
        if (weekBest > 0 && prMap[exId] && weekBest >= prMap[exId].max1RM) prCount++;
      });

      // Weekly trend (4 weeks)
      const weeklyTrend = weekBounds.map((wb, i) => ({
        week: wb.label,
        volume: Math.round(vol(weekData[i])),
        sets: weekData[i].length,
      })).reverse();

      setWeeklySummary({
        sets: thisWeek.length,
        volume: Math.round(vol(thisWeek)),
        exercises: new Set(thisWeek.map(l => l.exercise_id)).size,
        days: new Set(thisWeek.map(l => l.date)).size,
        lastWeekVolume: Math.round(vol(lastWeek)),
        lastWeekSets: lastWeek.length,
        volumeByMuscle,
        overloadCount,
        prCount,
        weeklyTrend,
      });
    } catch (err) {
      console.error('Failed to compute weekly summary:', err);
    }
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
    setProteinLogs([]);
    setEditingSetId(null);
    setDeleteConfirmId(null);
    setEditingProteinId(null);
    setDeleteProteinConfirmId(null);
    if (workoutDates.has(dateStr)) {
      await loadWorkoutsForDate(dateStr);
    }
    await loadProteinLogs(dateStr);
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
    const unsubscribe = onAuthChange((event, authUser) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset-password link in their email — show the reset form.
        setError('');
        setSuccess('');
        setPage('resetPassword');
      } else if (authUser) {
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
      const savedDate = localStorage.getItem('gymtracker_selectedDate');
      const today = getLocalToday();
      const initialDate = savedDate || today;
      setSelectedCalendarDate(initialDate);

      // Restore dashboard view from localStorage
      const savedView = localStorage.getItem('gymtracker_dashboardView');
      if (savedView && ['main', 'myWorkouts', 'settings', 'progressReport', 'mesocycle'].includes(savedView)) {
        setDashboardView(savedView);
      }

      loadExercises().then(() => loadWorkoutsForDate(initialDate));
      loadWorkoutDates().then(dates => {
        computeProgressiveOverload();
        setStreak(computeStreak(dates || workoutDates));
        // Build last workout info for "Repeat" button
        const sorted = [...(dates || workoutDates)].sort();
        const lastDate = sorted.length > 0 ? sorted[sorted.length - 1] : null;
        if (lastDate) {
          api.fetchWorkoutsForDate(user.id, lastDate).then(workouts => {
            if (workouts.length > 0) {
              setLastWorkoutInfo({
                date: lastDate,
                exerciseIds: [...new Set(workouts.map(w => w.exerciseId))],
                exerciseNames: [...new Set(workouts.map(w => w.exercise))],
              });
            }
          }).catch(() => {});
        }
      });
      loadTemplates();
      loadProteinLogs(initialDate);
      // Load smart defaults (last used weight/reps per exercise)
      api.fetchLastSetsForAllExercises(user.id).then(map => setLastUsedWeights(map)).catch(() => {});
      // Load all logs for PR map + double progression
      api.fetchAllUserLogs(user.id).then(logs => {
        setProgressAllLogs(logs);
        setPrMap(buildPrMap(logs));
        computeDoubleProgression(logs);
      }).catch(() => {});
      // Load weight stacks from localStorage
      try {
        const saved = localStorage.getItem('gymtracker_weightStacks');
        if (saved) setWeightStacks(JSON.parse(saved));
      } catch (e) {}
      // Load active mesocycle
      api.fetchActiveMesocycle(user.id).then(result => {
        if (result) {
          setActiveMeso(result.meso);
          setMesoScheduleState(result.schedule || []);
        }
      }).catch(() => {});
      // Weekly summary
      computeWeeklySummary();
      // Load profile data for Slack status
      getProfile(user.id).then(profile => {
        if (profile?.slack_user_id) {
          setSlackLinked(true);
          setSlackUserId(profile.slack_user_id);
        }
      }).catch(() => {});
    }
  }, [page, user]);

  // Persist selected date and dashboard view to localStorage
  useEffect(() => {
    if (selectedCalendarDate) localStorage.setItem('gymtracker_selectedDate', selectedCalendarDate);
  }, [selectedCalendarDate]);
  useEffect(() => {
    localStorage.setItem('gymtracker_dashboardView', dashboardView);
  }, [dashboardView]);

  // Persist weight stacks to localStorage
  useEffect(() => {
    if (Object.keys(weightStacks).length > 0) {
      localStorage.setItem('gymtracker_weightStacks', JSON.stringify(weightStacks));
    }
  }, [weightStacks]);

  // Cleanup rest timer on unmount
  useEffect(() => {
    return () => { if (restTimerInterval) clearInterval(restTimerInterval); };
  }, [restTimerInterval]);

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
              <div className="mt-4 text-center">
                <button onClick={() => { setPage('forgotPassword'); setError(''); setSuccess(''); }} className="text-gray-400 hover:text-gray-300 text-sm transition">
                  Forgot password?
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-gray-500 mb-3">Don't have an account?</p>
                <button onClick={() => { setPage('signup'); setError(''); setSuccess(''); }} className="text-yellow-400 hover:text-yellow-300 font-semibold transition">
                  Create account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Forgot Password ───────────────────────────── */}
      {page === 'forgotPassword' && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Zap className="w-12 h-12 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
              <p className="text-gray-400">Enter your email to receive a reset link</p>
            </div>
            <div className={cardClass}>
              <div className="mb-5">
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              {error && <div className="mb-4 p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
              <button onClick={() => handleForgotPassword(email)} disabled={loading || !!success} className={btnPrimary}>
                {loading ? 'Sending…' : 'Send Reset Link'}
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

      {/* ── Reset Password (after clicking email link) ── */}
      {page === 'resetPassword' && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Zap className="w-12 h-12 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-bold mb-2">New Password</h1>
              <p className="text-gray-400">Choose a strong password for your account</p>
            </div>
            <div className={cardClass}>
              <div className="mb-5">
                <input type="password" placeholder="New password (min 6 characters)" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
              </div>
              {error && <div className="mb-4 p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
              <button onClick={() => handleResetPassword(newPassword)} disabled={loading || !!success} className={btnPrimary}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
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
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold">Welcome back!</h1>
                  <p className="text-gray-400 mt-1">{user.email}</p>
                </div>
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-lg">
                    <span className="text-lg">🔥</span>
                    <span className="font-bold text-orange-400 text-sm">{streak}d streak</span>
                  </div>
                )}
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
                      onClick={() => {
                        if (dashboardView !== 'progressReport') {
                          setDashboardView('progressReport');
                          if (progressAllLogs.length === 0) loadProgressData();
                        } else {
                          setDashboardView('main');
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition border ${
                        dashboardView === 'progressReport'
                          ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                      Progress
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
                      onClick={() => setDashboardView(dashboardView === 'mesocycle' ? 'main' : 'mesocycle')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition border ${
                        dashboardView === 'mesocycle'
                          ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                      Meso
                      {activeMeso && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          dashboardView === 'mesocycle' ? 'bg-gray-900/30 text-gray-900' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>W{computeCurrentMesoWeek(activeMeso)}</span>
                      )}
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

          {/* ── Weekly Summary + Repeat Last Workout ────── */}
          {dashboardView === 'main' && (
            <div className="max-w-7xl mx-auto mb-6 space-y-3">

              {/* Meso Status Bar */}
              {activeMeso && (() => {
                const week = computeCurrentMesoWeek(activeMeso);
                const rir = (activeMeso.rir_schedule || [])[week - 1] ?? 2;
                const nextW = computeNextWorkout(activeMeso, mesoSchedule, workoutTemplates);
                return (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-yellow-400">{activeMeso.name}</span>
                          <span className="text-gray-400 text-sm ml-3">Week {week} of {activeMeso.num_weeks}</span>
                          <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            rir === 3 ? 'bg-orange-500/20 text-orange-400' :
                            rir === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                            rir === 1 ? 'bg-lime-500/20 text-lime-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>{rir === 0 ? 'AMRAP Week' : `${rir} RIR`}</span>
                        </div>
                      </div>
                      <button onClick={() => setDashboardView('mesocycle')}
                        className="text-xs text-gray-500 hover:text-white transition">
                        Manage →
                      </button>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${(week / activeMeso.num_weeks) * 100}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Next Workout Card */}
              {activeMeso && (() => {
                const week = computeCurrentMesoWeek(activeMeso);
                const nextW = computeNextWorkout(activeMeso, mesoSchedule, workoutTemplates);
                if (!nextW) return null;
                return (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Next Session</span>
                        <h3 className="font-bold text-white text-lg mt-0.5">{nextW.template.name}</h3>
                        <span className="text-sm text-gray-400">
                          {nextW.dayOffset === 1 ? 'Tomorrow' : dayNames[(new Date().getDay() + nextW.dayOffset) % 7]}
                        </span>
                      </div>
                      <button onClick={() => startMesoWorkout(nextW.template)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-6 py-2.5 rounded-lg transition flex-shrink-0">
                        Start
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {nextW.template.exerciseIds.slice(0, 8).map(exId => {
                        const ex = exercises.find(e => e.id === exId);
                        const target = computeWeeklyTarget(exId, week, activeMeso);
                        return (
                          <span key={exId} className="text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-300">
                            {ex?.name || '?'}{target ? ` · ${target.targetReps}r@${target.targetWeight}kg` : ''}
                          </span>
                        );
                      })}
                      {nextW.template.exerciseIds.length > 8 && (
                        <span className="text-xs text-gray-600 px-2 py-1">+{nextW.template.exerciseIds.length - 8} more</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Weekly Summary Dashboard */}
              {weeklySummary && weeklySummary.sets > 0 && (
                <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-5 py-4">
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                    <span className="font-semibold text-gray-300">This Week</span>
                    <span className="text-yellow-400 font-bold">{weeklySummary.sets} sets</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-300">{weeklySummary.volume.toLocaleString()}kg volume</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-300">{weeklySummary.exercises} exercises</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-300">{weeklySummary.days}/7 days</span>
                    {weeklySummary.lastWeekSets > 0 && (() => {
                      const pct = Math.round(((weeklySummary.volume - weeklySummary.lastWeekVolume) / weeklySummary.lastWeekVolume) * 100);
                      return (
                        <span className={`font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs last week
                        </span>
                      );
                    })()}
                  </div>

                  {/* 3-column detail grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Volume by muscle group */}
                    {weeklySummary.volumeByMuscle && Object.keys(weeklySummary.volumeByMuscle).length > 0 && (
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Volume by Muscle</h4>
                        <div className="space-y-1.5">
                          {Object.entries(weeklySummary.volumeByMuscle)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 6)
                            .map(([muscle, vol]) => {
                              const maxVol = Math.max(...Object.values(weeklySummary.volumeByMuscle));
                              return (
                                <div key={muscle} className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-400 capitalize w-16 truncate">{muscle}</span>
                                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(vol / maxVol) * 100}%` }} />
                                  </div>
                                  <span className="text-gray-500 w-14 text-right">{vol.toLocaleString()}kg</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Consistency & Trend */}
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Consistency</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{weeklySummary.days}</div>
                          <div className="text-xs text-gray-500">days</div>
                        </div>
                        {streak > 0 && (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-400">{streak}d</div>
                            <div className="text-xs text-gray-500">streak</div>
                          </div>
                        )}
                      </div>
                      {weeklySummary.weeklyTrend && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">4-Week Volume</div>
                          <div className="flex items-end gap-1 h-10">
                            {weeklySummary.weeklyTrend.map((w, i) => {
                              const maxVol = Math.max(...weeklySummary.weeklyTrend.map(t => t.volume));
                              const pct = maxVol > 0 ? (w.volume / maxVol) * 100 : 0;
                              const isCurrent = i === weeklySummary.weeklyTrend.length - 1;
                              return (
                                <div key={w.week} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className={`w-full rounded-sm ${isCurrent ? 'bg-yellow-500' : 'bg-gray-600'}`}
                                    style={{ height: `${Math.max(pct, 5)}%` }} />
                                  <span className="text-[10px] text-gray-600">{w.week}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progression */}
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Progression</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/15 text-green-400 font-bold text-lg">
                            {weeklySummary.overloadCount || 0}
                          </span>
                          <div>
                            <div className="text-sm text-white font-medium">Overload Days</div>
                            <div className="text-xs text-gray-500">Sessions with progression</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold text-lg">
                            {weeklySummary.prCount || 0}
                          </span>
                          <div>
                            <div className="text-sm text-white font-medium">PRs Hit</div>
                            <div className="text-xs text-gray-500">Exercises at all-time best</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Repeat last workout button */}
              {lastWorkoutInfo && !activeTemplate && (
                <button
                  onClick={() => {
                    setActiveTemplate({ name: 'Repeat Workout', exerciseIds: lastWorkoutInfo.exerciseIds });
                    setActiveExerciseIndex(0);
                    setDashboardView('activeWorkout');
                    const firstEx = lastWorkoutInfo.exerciseIds[0];
                    const last = lastUsedWeights[firstEx];
                    if (last) { setWeight(String(last.weight)); setReps(String(last.reps)); }
                  }}
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-5 py-3 flex items-center gap-3 transition text-left"
                >
                  <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <span className="font-semibold text-sm">Repeat Last Workout</span>
                  <span className="text-gray-500 text-xs ml-auto truncate max-w-xs">{lastWorkoutInfo.exerciseNames.slice(0, 4).join(' · ')}</span>
                </button>
              )}
            </div>
          )}

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
                      onClick={() => { setEditingTemplate({ id: null }); setTemplateName(''); setTemplateExercises([]); setTemplateExerciseSearch(''); setShowAddExercise(false); setError(''); }}
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
                    {/* Searchable exercise input (like Log Set) */}
                    <div className="relative mb-1">
                      <input
                        type="text"
                        value={templateExerciseSearch}
                        onChange={(e) => { setTemplateExerciseSearch(e.target.value); setShowTemplateExerciseDropdown(true); }}
                        onFocus={() => setShowTemplateExerciseDropdown(true)}
                        placeholder="Type to search exercises..."
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                      />
                      {showTemplateExerciseDropdown && (
                        <div className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
                          {!templateExerciseSearch.trim() && Object.keys(lastUsedWeights).length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs text-gray-500 font-semibold">Recent</div>
                              {Object.keys(lastUsedWeights).slice(0, 5)
                                .filter(exId => !templateExercises.some(t => t.exerciseId === exId))
                                .map(exId => {
                                  const ex = exercises.find(e => e.id === exId);
                                  if (!ex) return null;
                                  return (
                                    <button key={exId} type="button"
                                      onClick={() => {
                                        setTemplateExercises(prev => [...prev, { exerciseId: ex.id, sets: 3 }]);
                                        setTemplateExerciseSearch('');
                                        setShowTemplateExerciseDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-white transition flex justify-between">
                                      <span>{ex.name}</span>
                                      <span className="text-gray-500 text-xs capitalize">{ex.primary_muscle?.replace(/_/g, ' ')}</span>
                                    </button>
                                  );
                                })}
                              <div className="border-t border-gray-700" />
                            </>
                          )}
                          {templateExerciseSearch.trim() && exercises
                            .filter(ex =>
                              ex.name.toLowerCase().includes(templateExerciseSearch.toLowerCase()) &&
                              !templateExercises.some(t => t.exerciseId === ex.id)
                            )
                            .slice(0, 8)
                            .map(ex => (
                              <button key={ex.id} type="button"
                                onClick={() => {
                                  setTemplateExercises(prev => [...prev, { exerciseId: ex.id, sets: 3 }]);
                                  setTemplateExerciseSearch('');
                                  setShowTemplateExerciseDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-white transition">
                                <span>{ex.name}</span>
                                <span className="text-gray-500 text-xs ml-2 capitalize">{ex.primary_muscle?.replace(/_/g, ' ')}</span>
                              </button>
                            ))}
                          {templateExerciseSearch.trim() &&
                            exercises.filter(ex =>
                              ex.name.toLowerCase().includes(templateExerciseSearch.toLowerCase()) &&
                              !templateExercises.some(t => t.exerciseId === ex.id)
                            ).length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-sm">No exercises found</div>
                          )}
                          {!templateExerciseSearch.trim() && Object.keys(lastUsedWeights).length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-sm">Start typing to search exercises</div>
                          )}
                        </div>
                      )}
                      {showTemplateExerciseDropdown && (
                        <div className="fixed inset-0 z-40" onClick={() => setShowTemplateExerciseDropdown(false)} />
                      )}
                    </div>
                    {/* Add new exercise toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAddExercise(!showAddExercise)}
                      className="text-xs text-yellow-400 hover:text-yellow-300 transition mb-3">
                      {showAddExercise ? '- Cancel adding exercise' : '+ Add New Exercise'}
                    </button>
                    {showAddExercise && (
                      <div className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-600 space-y-2">
                        <input type="text" value={newExerciseName}
                          onChange={e => setNewExerciseName(e.target.value)}
                          placeholder="Exercise name (e.g. Cable Flye)"
                          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
                        <select value={newExerciseMuscle}
                          onChange={e => setNewExerciseMuscle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:border-yellow-500">
                          <option value="">Select muscle group (optional)</option>
                          {[...new Set(exercises.map(ex => ex.primary_muscle).filter(Boolean))].sort().map(m => (
                            <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button onClick={addNewExercise}
                          className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-3 py-1.5 rounded-lg text-sm transition">
                          Add Exercise
                        </button>
                      </div>
                    )}
                    {/* Exercise list with sets */}
                    {templateExercises.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {templateExercises.map((item, idx) => {
                          const ex = exercises.find(e => e.id === item.exerciseId);
                          return (
                            <div key={item.exerciseId} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg">
                              <span className="text-sm flex-1"><span className="text-gray-500 mr-2">{idx + 1}.</span>{ex?.name || 'Unknown'}</span>
                              <div className="flex items-center gap-2">
                                <input type="number" min="1" max="10" value={item.sets}
                                  onChange={e => {
                                    const newSets = parseInt(e.target.value) || 1;
                                    setTemplateExercises(prev => prev.map((t, i) =>
                                      i === idx ? { ...t, sets: newSets } : t
                                    ));
                                  }}
                                  className="w-14 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm text-center focus:outline-none focus:border-yellow-500" />
                                <span className="text-xs text-gray-500">sets</span>
                                <button onClick={() => setTemplateExercises(templateExercises.filter((_, i) => i !== idx))}
                                  className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
                              </div>
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
                      <button onClick={() => { setEditingTemplate(null); setShowAddExercise(false); setError(''); }}
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
                              setTemplateExercises(template.exercises ? [...template.exercises] : template.exerciseIds.map(id => ({ exerciseId: id, sets: 3 })));
                              setTemplateExerciseSearch('');
                              setShowAddExercise(false);
                              setError('');
                            }} className="p-1.5 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteTemplate(template.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {(template.exercises || template.exerciseIds.map(id => ({ exerciseId: id, sets: 3 }))).map(item => {
                            const ex = exercises.find(e => e.id === item.exerciseId);
                            return `${ex?.name || 'Unknown'} (${item.sets}x)`;
                          }).join(' \u2022 ')}
                        </p>
                        {/* Progression toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedTemplateId(expandedTemplateId === template.id ? null : template.id)}
                          className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {expandedTemplateId === template.id ? 'Hide Progression' : 'Show Progression'}
                        </button>
                        {/* Progression Timeline */}
                        {expandedTemplateId === template.id && (
                          <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                            {template.exerciseIds.map(exId => {
                              const ex = exercises.find(e => e.id === exId);
                              const timeline = getExerciseProgressionTimeline(exId);
                              if (timeline.length === 0) return (
                                <div key={exId} className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-500 w-24 truncate">{ex?.name || 'Unknown'}</span>
                                  <span className="text-gray-600">No data</span>
                                </div>
                              );
                              const latest = timeline[timeline.length - 1];
                              return (
                                <div key={exId} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-24 truncate flex-shrink-0" title={ex?.name}>{ex?.name || 'Unknown'}</span>
                                  <div className="flex gap-0.5 flex-shrink-0">
                                    {timeline.map((s, i) => (
                                      <div key={i} title={`${s.date}: ${s.weight}kg x ${s.reps} (${s.status})`}
                                        className={`w-3 h-3 rounded-full ${
                                          s.status === 'improved' ? 'bg-green-500' :
                                          s.status === 'regressed' ? 'bg-red-500' :
                                          s.status === 'first' ? 'bg-blue-500' :
                                          'bg-gray-600'
                                        }`} />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500 ml-auto flex-shrink-0">{latest.weight}kg x {latest.reps}</span>
                                </div>
                              );
                            })}
                            <div className="flex gap-3 text-[10px] text-gray-600 mt-1">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Improved</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" /> Same</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Regressed</span>
                            </div>
                          </div>
                        )}
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
                  {activeTemplate.exerciseIds.map((exId, idx) => {
                    const templateEx = activeTemplate.exercises?.[idx];
                    const logged = activeWorkoutSetsLogged[exId] || 0;
                    const target = templateEx?.sets || 3;
                    return (
                      <button key={exId}
                        onClick={() => { setActiveExerciseIndex(idx); setSelectedExercise(exId); setWeight(''); setReps(''); }}
                        className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
                          idx === activeExerciseIndex
                            ? 'bg-yellow-500 text-gray-900'
                            : logged >= target
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-400'
                        }`}>
                        {exercises.find(e => e.id === exId)?.name || 'Unknown'}
                        <span className="ml-1 opacity-70">({logged}/{target})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Log form */}
                <form onSubmit={logWorkout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Current Exercise</label>
                    <div className="px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white font-semibold flex justify-between">
                      <span>{exercises.find(e => e.id === activeTemplate.exerciseIds[activeExerciseIndex])?.name || 'Unknown'}</span>
                      <span className="text-gray-400 font-normal">
                        Set {(activeWorkoutSetsLogged[activeTemplate.exerciseIds[activeExerciseIndex]] || 0) + 1} of {activeTemplate.exercises?.[activeExerciseIndex]?.sets || 3}
                      </span>
                    </div>
                  </div>
                  {/* Meso Target Card */}
                  {(() => {
                    const curExId = activeTemplate.exerciseIds[activeExerciseIndex];
                    const target = mesoExerciseTargets[curExId];
                    if (!activeMeso || !target) return null;
                    const week = computeCurrentMesoWeek(activeMeso);
                    // Find last week best for comparison
                    const mesoStart = new Date(activeMeso.start_date);
                    const lwStart = new Date(mesoStart);
                    lwStart.setDate(mesoStart.getDate() + (week - 2) * 7);
                    const lwEnd = new Date(lwStart);
                    lwEnd.setDate(lwStart.getDate() + 6);
                    const lwLogs = (overloadCacheRef.current || []).filter(r =>
                      r.exercise_id === curExId && r.date >= fmtDate(lwStart) && r.date <= fmtDate(lwEnd)
                    );
                    const lwBest = lwLogs.length ? lwLogs.reduce((b, l) =>
                      (compute1RM(l.weight_kg, l.reps) || 0) > (compute1RM(b.weight_kg, b.reps) || 0) ? l : b
                    , lwLogs[0]) : null;
                    return (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
                            Week {week} Target · {target.rirTarget === 0 ? 'AMRAP' : `${target.rirTarget} RIR`}
                          </span>
                          <button type="button"
                            onClick={() => { setWeight(String(target.targetWeight)); setReps(String(target.targetReps)); }}
                            className="text-xs text-blue-400 hover:text-blue-300 underline transition">
                            Use target
                          </button>
                        </div>
                        <div className="text-white font-bold text-base">
                          {target.targetReps} reps @ {target.targetWeight}kg
                        </div>
                        {lwBest && (
                          <div className="text-xs text-gray-500">
                            Last week: {lwBest.reps} reps @ {lwBest.weight_kg}kg
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Set Status Log */}
                  {activeMeso && (() => {
                    const curExId = activeTemplate.exerciseIds[activeExerciseIndex];
                    const logs = setStatusLog.filter(s => s.exerciseId === curExId);
                    if (!logs.length) return null;
                    return (
                      <div className="flex gap-2 flex-wrap">
                        {logs.map((s, i) => (
                          <span key={i} className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            s.status === 'exceeded' ? 'bg-yellow-500/15 text-yellow-400' :
                            s.status === 'met' ? 'bg-green-500/15 text-green-400' :
                            'bg-red-500/15 text-red-400'
                          }`}>
                            {s.status === 'exceeded' ? '↑ Exceeded' : s.status === 'met' ? '✓ Met' : '✗ Missed'} (Set {s.setNum})
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {/* Double Progression Recommendation */}
                  {(() => {
                    const curExId = activeTemplate.exerciseIds[activeExerciseIndex];
                    const rec = doubleProgressionRecs[curExId];
                    if (!rec) return null;
                    return (
                      <button type="button" onClick={() => setWeight(String(rec.recommendedWeight))}
                        className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-left hover:bg-yellow-500/20 transition">
                        <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
                          <TrendingUp className="w-4 h-4" />
                          <span>Weight Increase Recommended</span>
                        </div>
                        <p className="text-gray-300 text-xs mt-1">
                          You hit {rec.reps} reps on first set at {rec.weight}kg — try {rec.recommendedWeight}kg
                        </p>
                      </button>
                    );
                  })()}
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
                  {/* AMRAP Weight Equivalence Calculator */}
                  {(() => {
                    const curExId = activeTemplate.exerciseIds[activeExerciseIndex];
                    if (!weightStacks[curExId] || !weight || !reps) return null;
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                        <button type="button" onClick={() => setWeightCalcExpanded(!weightCalcExpanded)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-400 hover:text-white transition">
                          <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> AMRAP Equivalence</span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${weightCalcExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        {weightCalcExpanded && (
                          <div className="px-4 pb-3 space-y-1">
                            {weightStacks[curExId]
                              .filter(w => w !== parseFloat(weight))
                              .map(targetW => {
                                const eqReps = computeEquivalentReps(parseFloat(weight), parseInt(reps), targetW);
                                const isNext = targetW > parseFloat(weight) && !weightStacks[curExId].some(w2 => w2 > parseFloat(weight) && w2 < targetW);
                                return (
                                  <div key={targetW} className={`flex justify-between text-sm py-1 px-2 rounded ${isNext ? 'bg-green-500/10 border border-green-500/20' : ''}`}>
                                    <span className={isNext ? 'text-green-400 font-medium' : 'text-gray-400'}>{targetW}kg</span>
                                    <span className={isNext ? 'text-green-300 font-medium' : 'text-white'}>{eqReps ? `~${eqReps} reps` : 'Too heavy'}</span>
                                  </div>
                                );
                              })}
                            <p className="text-xs text-gray-600 mt-2">Reps needed to match your current effort</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
              {/* Slack Integration */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-6">
                  <Slack className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold">Slack Integration</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Log workouts directly from Slack using a slash command. Type <code className="bg-gray-900 px-1.5 py-0.5 rounded text-purple-300">/gymlog bench press 100kg x5</code> and it's automatically added to your tracker.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Your Slack User ID</label>
                    <input
                      type="text"
                      value={slackUserId}
                      onChange={e => setSlackUserId(e.target.value)}
                      placeholder="U01ABCDE123"
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Find it in Slack: click your name → View profile → More (⋯) → Copy member ID
                    </p>
                  </div>
                  {slackLinked && (
                    <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg text-purple-300 text-sm">
                      ✓ Linked as <span className="font-mono font-bold">{slackUserId}</span>
                    </div>
                  )}
                  {error && <div className="p-3 bg-red-500 bg-opacity-15 border border-red-600 rounded-lg text-red-300 text-sm">{error}</div>}
                  {success && <div className="p-3 bg-green-500 bg-opacity-15 border border-green-600 rounded-lg text-green-300 text-sm">{success}</div>}
                  <button
                    onClick={saveSlackSettings}
                    disabled={slackSaving || !slackUserId.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {slackSaving ? 'Saving...' : <><Slack className="w-5 h-5" /> Save Slack User ID</>}
                  </button>
                </div>
              </div>

              {/* Setup Instructions */}
              <div className={cardClass}>
                <h3 className="font-bold mb-3">Slack App Setup</h3>
                <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                  <li>Go to <span className="text-purple-400">api.slack.com/apps</span> and create a new app</li>
                  <li>Add a Slash Command: <code className="bg-gray-900 px-1 rounded">/gymlog</code></li>
                  <li>Set the Request URL to: <code className="bg-gray-900 px-1 rounded text-xs">https://yourapp.netlify.app/.netlify/functions/slack-log</code></li>
                  <li>Copy the Signing Secret and add it to Netlify env as <code className="bg-gray-900 px-1 rounded">SLACK_SIGNING_SECRET</code></li>
                  <li>Save your Slack User ID above to link your account</li>
                </ol>
                <div className="mt-4 p-3 bg-gray-900 rounded-lg text-sm">
                  <p className="text-gray-400 mb-2">Example Slack commands:</p>
                  <div className="font-mono text-xs text-purple-300 space-y-1">
                    <div>/gymlog bench press 100kg x5</div>
                    <div>/gymlog squat 120 3x8</div>
                    <div>/gymlog pullups 80kg 10 reps</div>
                  </div>
                </div>
              </div>

              {/* Weight Stacks (AMRAP Equivalence) */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-6">
                  <Zap className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold">Weight Stacks</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Define available weights for machine exercises. The AMRAP equivalence calculator will show how many reps at a different weight match your current effort.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Exercise</label>
                    <select
                      value={weightStackExerciseSearch}
                      onChange={e => setWeightStackExerciseSearch(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-green-500 transition"
                    >
                      <option value="">Select an exercise...</option>
                      {exercises.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  </div>
                  {weightStackExerciseSearch && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Available Weights (comma-separated, in kg)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={weightStackInput}
                          onChange={e => setWeightStackInput(e.target.value)}
                          placeholder="20, 25, 32, 39, 45"
                          className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const weights = weightStackInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
                            if (weights.length >= 2) {
                              setWeightStacks(prev => ({ ...prev, [weightStackExerciseSearch]: weights }));
                              setWeightStackInput('');
                              setWeightStackExerciseSearch('');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-3 rounded-lg transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                  {Object.keys(weightStacks).length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-semibold text-gray-400">Configured Exercises</h4>
                      {Object.entries(weightStacks).map(([exId, weights]) => {
                        const ex = exercises.find(e => e.id === exId);
                        return (
                          <div key={exId} className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2.5">
                            <div>
                              <span className="text-white text-sm font-medium">{ex?.name || exId}</span>
                              <span className="text-gray-500 text-xs ml-2">{weights.join(', ')}kg</span>
                            </div>
                            <button type="button" onClick={() => setWeightStacks(prev => {
                              const next = { ...prev };
                              delete next[exId];
                              return next;
                            })} className="text-red-400 hover:text-red-300 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Mesocycle View ───────────────────────── */}
          {dashboardView === 'mesocycle' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button onClick={() => { setDashboardView('main'); setMesoSetupStep(null); }}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition text-sm">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-xl font-bold">Mesocycle</h2>
              </div>

              {/* Setup Wizard */}
              {mesoSetupStep && (
                <div className={cardClass}>
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 mb-6">
                    {['config', 'split', 'week1'].map((step, i) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          mesoSetupStep === step ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-400'
                        }`}>{i + 1}</span>
                        <span className={`text-sm ${mesoSetupStep === step ? 'text-white' : 'text-gray-600'}`}>
                          {step === 'config' ? 'Configure' : step === 'split' ? 'Split' : 'Week 1'}
                        </span>
                        {i < 2 && <ChevronRight className="w-3 h-3 text-gray-700" />}
                      </div>
                    ))}
                  </div>

                  {/* Step 1: Config */}
                  {mesoSetupStep === 'config' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Mesocycle Name</label>
                        <input type="text" value={mesoName} onChange={e => setMesoName(e.target.value)}
                          placeholder="e.g. Summer Hypertrophy Block"
                          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">
                          Number of Weeks: <span className="text-yellow-400">{mesoNumWeeks}</span>
                        </label>
                        <input type="range" min="4" max="16" value={mesoNumWeeks}
                          onChange={e => setMesoNumWeeks(parseInt(e.target.value))}
                          className="w-full accent-yellow-500" />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>4 weeks</span><span>16 weeks</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Start Date</label>
                        <input type="date" value={mesoStartDate || getNextMonday()}
                          onChange={e => setMesoStartDate(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-yellow-500 transition" />
                      </div>
                      {/* RIR timeline preview */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">RIR Schedule</label>
                        <div className="flex gap-1 flex-wrap">
                          {buildRirSchedule(mesoNumWeeks).map((rir, i) => (
                            <div key={i} className={`flex flex-col items-center gap-0.5`}>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                rir === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                rir === 2 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                rir === 1 ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' :
                                'bg-green-500/20 text-green-400 border border-green-500/30'
                              }`}>
                                {rir === 0 ? 'MAX' : `${rir}RIR`}
                              </span>
                              <span className="text-[10px] text-gray-600">W{i + 1}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Week 1 = conservative start (3 RIR). Intensity builds to max effort.</p>
                      </div>
                      <button onClick={() => { if (mesoName.trim()) setMesoSetupStep('split'); else showToast('error', 'Enter a name'); }}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg transition">
                        Next: Set Split →
                      </button>
                    </div>
                  )}

                  {/* Step 2: Split */}
                  {mesoSetupStep === 'split' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">Assign a workout template to each training day. Days left empty are rest days.</p>
                      {/* Monday-first order: 1,2,3,4,5,6,0 */}
                      {[1, 2, 3, 4, 5, 6, 0].map(dow => (
                        <div key={dow} className="flex items-center gap-3">
                          <span className="text-sm text-gray-400 w-12 flex-shrink-0">{dayNamesShort[dow]}</span>
                          <select
                            value={mesoDraftSchedule[dow] || 'rest'}
                            onChange={e => setMesoDraftSchedule(prev => ({ ...prev, [dow]: e.target.value }))}
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-yellow-500 transition">
                            <option value="rest">— Rest —</option>
                            {workoutTemplates.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {workoutTemplates.length === 0 && (
                        <p className="text-yellow-400 text-sm">No templates found. <button onClick={() => setDashboardView('myWorkouts')} className="underline">Create templates first</button></p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setMesoSetupStep('config')}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold transition">
                          ← Back
                        </button>
                        <button onClick={() => setMesoSetupStep('week1')}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg transition">
                          Next: Week 1 →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Week 1 starting weights */}
                  {mesoSetupStep === 'week1' && (
                    <div className="space-y-4">
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-3 text-sm text-orange-300">
                        Set your Week 1 starting weights at <strong>3 RIR</strong> — use a weight you can do 3 reps short of failure. These are logged when you first train each exercise.
                      </div>
                      {/* Show exercises grouped by day */}
                      {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                        const templateId = mesoDraftSchedule[dow];
                        if (!templateId || templateId === 'rest') return null;
                        const template = workoutTemplates.find(t => t.id === templateId);
                        if (!template) return null;
                        return (
                          <div key={dow} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <h4 className="font-semibold text-yellow-400 mb-3">{dayNamesShort[dow]} — {template.name}</h4>
                            <div className="space-y-2">
                              {template.exerciseIds.map(exId => {
                                const ex = exercises.find(e => e.id === exId);
                                const w1 = mesoWeek1Weights[exId] || {};
                                return (
                                  <div key={exId} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-300 flex-1">{ex?.name || 'Unknown'}</span>
                                    <input type="number" step="0.5" placeholder="kg"
                                      value={w1.weight || lastUsedWeights[exId]?.weight || ''}
                                      onChange={e => setMesoWeek1Weights(prev => ({ ...prev, [exId]: { ...prev[exId], weight: e.target.value } }))}
                                      className="w-20 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm text-center focus:outline-none focus:border-yellow-500" />
                                    <span className="text-gray-600 text-xs">×</span>
                                    <input type="number" placeholder="reps"
                                      value={w1.reps || lastUsedWeights[exId]?.reps || ''}
                                      onChange={e => setMesoWeek1Weights(prev => ({ ...prev, [exId]: { ...prev[exId], reps: e.target.value } }))}
                                      className="w-16 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm text-center focus:outline-none focus:border-yellow-500" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-2">
                        <button onClick={() => setMesoSetupStep('split')}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold transition">
                          ← Back
                        </button>
                        <button onClick={saveMesocycle} disabled={mesoSaving}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-40">
                          {mesoSaving ? 'Creating...' : 'Start Mesocycle'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Meso Panel */}
              {!mesoSetupStep && (
                <>
                  {activeMeso ? (
                    <div className={cardClass}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-yellow-400">{activeMeso.name}</h3>
                          <p className="text-sm text-gray-400">
                            Week {computeCurrentMesoWeek(activeMeso)} of {activeMeso.num_weeks} ·
                            Started {activeMeso.start_date}
                          </p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          activeMeso.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-gray-700 text-gray-400'
                        }`}>{activeMeso.status}</span>
                      </div>
                      {/* Week progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{computeCurrentMesoWeek(activeMeso)}/{activeMeso.num_weeks} weeks</span>
                        </div>
                        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all"
                            style={{ width: `${(computeCurrentMesoWeek(activeMeso) / activeMeso.num_weeks) * 100}%` }} />
                        </div>
                      </div>
                      {/* RIR timeline */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-2">RIR Schedule</div>
                        <div className="flex gap-1 flex-wrap">
                          {(activeMeso.rir_schedule || []).map((rir, i) => {
                            const isCurrent = i === computeCurrentMesoWeek(activeMeso) - 1;
                            return (
                              <div key={i} className={`flex flex-col items-center gap-0.5 ${isCurrent ? 'ring-2 ring-yellow-500 rounded' : ''}`}>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  rir === 3 ? 'bg-orange-500/20 text-orange-400' :
                                  rir === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                                  rir === 1 ? 'bg-lime-500/20 text-lime-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>{rir === 0 ? 'MAX' : `${rir}R`}</span>
                                <span className="text-[9px] text-gray-600">W{i + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Split summary */}
                      {mesoSchedule.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">Weekly Split</div>
                          <div className="grid grid-cols-7 gap-1">
                            {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                              const entry = mesoSchedule.find(s => s.day_of_week === dow);
                              const template = entry?.template_id ? workoutTemplates.find(t => t.id === entry.template_id) : null;
                              return (
                                <div key={dow} className={`text-center p-1 rounded text-[10px] ${template ? 'bg-yellow-500/10 text-yellow-300' : 'bg-gray-900 text-gray-600'}`}>
                                  <div className="font-bold">{dayNamesShort[dow]}</div>
                                  <div className="truncate">{template ? template.name.slice(0, 4) : '—'}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => api.updateMesocycleStatus(activeMeso.id, 'completed').then(() => { setActiveMeso(null); setMesoScheduleState([]); showToast('success', 'Meso completed!'); }).catch(() => showToast('error', 'Failed'))}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-lg transition text-sm">
                          Complete Meso
                        </button>
                        <button onClick={() => api.updateMesocycleStatus(activeMeso.id, 'cancelled').then(() => { setActiveMeso(null); setMesoScheduleState([]); showToast('success', 'Meso cancelled'); }).catch(() => showToast('error', 'Failed'))}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg transition text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={cardClass + ' text-center py-10'}>
                      <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active Mesocycle</h3>
                      <p className="text-gray-500 text-sm mb-6">Set up a structured training block with weekly RIR progression and automatic target calculations.</p>
                      <button onClick={() => { setMesoSetupStep('config'); setMesoStartDate(getNextMonday()); }}
                        className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-lg transition">
                        Create Mesocycle
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Progress Report View ─────────────────── */}
          {dashboardView === 'progressReport' && (
            <div className="max-w-7xl mx-auto space-y-6">

              {/* Controls card */}
              <div className={cardClass}>
                <div className="flex items-center gap-3 mb-5">
                  <TrendingUp className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-xl font-bold">Progress Report</h2>
                  <span className="text-gray-500 text-sm">Estimated 1RM per month · weight ÷ (1.0278 − 0.0278 × reps)</span>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {[
                    { id: 'big6', label: 'Big 6' },
                    { id: 'muscleGroup', label: 'Muscle Group' },
                    { id: 'workout', label: 'My Workout' },
                    { id: 'search', label: 'Search' },
                  ].map(m => (
                    <button key={m.id}
                      onClick={() => { setProgressMode(m.id); setProgressSearch(''); }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${
                        progressMode === m.id
                          ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                          : 'bg-gray-900 hover:bg-gray-700 border-gray-700 text-gray-300'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Mode-specific filter */}
                {progressMode === 'big6' && (
                  <p className="text-gray-500 text-sm">Squat · Bench Press · Deadlift · Pull-up · Row · Shoulder Press</p>
                )}
                {progressMode === 'muscleGroup' && (
                  <select value={progressMuscleGroup} onChange={e => setProgressMuscleGroup(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-yellow-500">
                    <option value="">Select muscle group…</option>
                    {[...new Set(exercises.map(ex => ex.primary_muscle))].sort().map(mg => (
                      <option key={mg} value={mg}>{mg.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                )}
                {progressMode === 'workout' && (
                  <select value={progressWorkoutId} onChange={e => setProgressWorkoutId(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-yellow-500">
                    <option value="">Select workout template…</option>
                    {workoutTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                {progressMode === 'search' && (
                  <div className="space-y-3">
                    <input type="text" value={progressSearch}
                      onChange={e => setProgressSearch(e.target.value)}
                      placeholder="Search exercises to add…"
                      className="w-full max-w-md px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
                    {progressSearch.trim() && (
                      <div className="flex flex-wrap gap-2">
                        {exercises.filter(ex => ex.name.toLowerCase().includes(progressSearch.toLowerCase())).slice(0, 15).map(ex => (
                          <button key={ex.id}
                            onClick={() => setProgressCustomIds(prev =>
                              prev.includes(ex.id) ? prev.filter(id => id !== ex.id) : [...prev, ex.id]
                            )}
                            className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                              progressCustomIds.includes(ex.id)
                                ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                                : 'bg-gray-900 hover:bg-gray-700 border-gray-700 text-gray-300'
                            }`}>
                            {ex.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {progressCustomIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {progressCustomIds.map(id => {
                          const ex = exercises.find(e => e.id === id);
                          return (
                            <span key={id} className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 border border-yellow-600 rounded-lg text-yellow-400 text-sm">
                              {ex?.name}
                              <button onClick={() => setProgressCustomIds(prev => prev.filter(i => i !== id))}>
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Exercise cards */}
              {progressLoading ? (
                <div className="text-center py-12 text-gray-500">Loading progress data…</div>
              ) : (() => {
                const displayIds = getProgressExercises();
                if (displayIds.length === 0) {
                  const hint = progressMode === 'big6' ? 'No Big 6 exercises matched in your database.' :
                    progressMode === 'muscleGroup' && !progressMuscleGroup ? 'Select a muscle group above.' :
                    progressMode === 'muscleGroup' ? 'No logged sets for this muscle group yet.' :
                    progressMode === 'workout' && !progressWorkoutId ? 'Select a workout template above.' :
                    progressMode === 'search' ? 'Search for exercises above and click to add them.' :
                    'No exercises selected.';
                  return <div className="text-center py-12 text-gray-500">{hint}</div>;
                }
                const chartData = buildChartData(displayIds);
                return (
                  <div className="space-y-5">
                    {/* ── Combined recharts line chart ── */}
                    <div className={cardClass}>
                      <ResponsiveContainer width="100%" height={380}>
                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="kg" width={58}
                            tickFormatter={v => `${v}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '13px' }}
                            labelStyle={{ color: '#f9fafb', fontWeight: 600, marginBottom: '4px' }}
                            formatter={(value, name) => [`${value}kg`, name]}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#d1d5db' }}
                            iconType="circle"
                          />
                          {displayIds.map((exId, i) => {
                            const ex = exercises.find(e => e.id === exId);
                            if (!ex) return null;
                            const color = CHART_COLORS[i % CHART_COLORS.length];
                            return (
                              <Line
                                key={exId}
                                type="monotone"
                                dataKey={ex.name}
                                stroke={color}
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: color, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ── Per-exercise summary cards ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {displayIds.map((exId, i) => {
                        const ex = exercises.find(e => e.id === exId);
                        if (!ex) return null;
                        const monthly = getMonthlyBest(exId);
                        const latest = monthly.length > 0 ? monthly[monthly.length - 1] : null;
                        const prev = monthly.length > 1 ? monthly[monthly.length - 2] : null;
                        const delta = latest && prev ? latest.value - prev.value : null;
                        const color = CHART_COLORS[i % CHART_COLORS.length];
                        return (
                          <div key={exId} className={`${cardClass} flex items-center gap-4 py-4`}>
                            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{ex.name}</h3>
                              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                                {ex.primary_muscle?.replace(/_/g, ' ')} · {monthly.length} month{monthly.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {latest ? (
                                <>
                                  <p className="text-xl font-bold leading-none" style={{ color }}>
                                    {Math.round(latest.value)}<span className="text-sm font-normal text-gray-400">kg</span>
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">{fmtMonth(latest.month)}</p>
                                  {delta !== null && (
                                    <p className={`text-xs font-bold mt-0.5 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}kg
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-600 text-sm">No data</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
                {/* Quick-start from saved workout */}
                {workoutTemplates.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quick Start Workout</label>
                    <div className="flex flex-wrap gap-2">
                      {workoutTemplates.map(template => (
                        <button key={template.id} type="button"
                          onClick={() => startActiveWorkout(template)}
                          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition">
                          {template.name}
                          <span className="text-gray-500 ml-1">({template.exercises ? template.exercises.length : template.exerciseIds.length})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={logWorkout} className="space-y-4">
                  {/* Searchable exercise input */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Exercise</label>
                    <input
                      type="text"
                      value={exerciseSearch}
                      onChange={(e) => { setExerciseSearch(e.target.value); setShowExerciseDropdown(true); setSelectedExercise(''); }}
                      onFocus={() => setShowExerciseDropdown(true)}
                      placeholder="Type to search... (e.g. bench, squat)"
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                    />
                    {showExerciseDropdown && (
                      <div className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
                        {/* Recently used exercises (when search is empty) */}
                        {!exerciseSearch.trim() && Object.keys(lastUsedWeights).length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-xs text-gray-500 font-semibold">Recent</div>
                            {Object.keys(lastUsedWeights).slice(0, 5).map(exId => {
                              const ex = exercises.find(e => e.id === exId);
                              if (!ex) return null;
                              return (
                                <button key={exId} type="button"
                                  onClick={() => {
                                    setSelectedExercise(ex.id);
                                    setSelectedMuscleGroup(ex.primary_muscle);
                                    setExerciseSearch(ex.name);
                                    setShowExerciseDropdown(false);
                                    const last = lastUsedWeights[ex.id];
                                    if (last) { setWeight(String(last.weight)); setReps(String(last.reps)); }
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-white transition flex justify-between">
                                  <span>{ex.name}</span>
                                  <span className="text-gray-500 text-xs">{lastUsedWeights[ex.id]?.weight}kg x {lastUsedWeights[ex.id]?.reps}</span>
                                </button>
                              );
                            })}
                            <div className="border-t border-gray-700" />
                          </>
                        )}
                        {/* Filtered exercise results */}
                        {exerciseSearch.trim() && exercises
                          .filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                          .slice(0, 8)
                          .map(ex => (
                            <button key={ex.id} type="button"
                              onClick={() => {
                                setSelectedExercise(ex.id);
                                setSelectedMuscleGroup(ex.primary_muscle);
                                setExerciseSearch(ex.name);
                                setShowExerciseDropdown(false);
                                const last = lastUsedWeights[ex.id];
                                if (last) { setWeight(String(last.weight)); setReps(String(last.reps)); }
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-white transition">
                              <span>{ex.name}</span>
                              <span className="text-gray-500 text-xs ml-2 capitalize">{ex.primary_muscle?.replace(/_/g, ' ')}</span>
                            </button>
                          ))}
                        {exerciseSearch.trim() && exercises.filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-sm">No exercises found</div>
                        )}
                        {!exerciseSearch.trim() && Object.keys(lastUsedWeights).length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-sm">Start typing to search exercises</div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedExercise && (
                    <div className="text-xs text-gray-500 -mt-2 flex justify-between">
                      <span className="capitalize">{selectedMuscleGroup?.replace(/_/g, ' ')}</span>
                      {lastUsedWeights[selectedExercise] && <span>Last: {lastUsedWeights[selectedExercise].weight}kg x {lastUsedWeights[selectedExercise].reps}</span>}
                    </div>
                  )}
                  {/* Double Progression Recommendation */}
                  {selectedExercise && doubleProgressionRecs[selectedExercise] && (
                    <button type="button" onClick={() => setWeight(String(doubleProgressionRecs[selectedExercise].recommendedWeight))}
                      className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-left hover:bg-yellow-500/20 transition">
                      <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Weight Increase Recommended</span>
                      </div>
                      <p className="text-gray-300 text-xs mt-1">
                        You hit {doubleProgressionRecs[selectedExercise].reps} reps on first set at {doubleProgressionRecs[selectedExercise].weight}kg — try {doubleProgressionRecs[selectedExercise].recommendedWeight}kg
                      </p>
                    </button>
                  )}
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
                  {/* AMRAP Weight Equivalence Calculator */}
                  {selectedExercise && weightStacks[selectedExercise] && weight && reps && (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                      <button type="button" onClick={() => setWeightCalcExpanded(!weightCalcExpanded)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-400 hover:text-white transition">
                        <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> AMRAP Equivalence</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${weightCalcExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      {weightCalcExpanded && (
                        <div className="px-4 pb-3 space-y-1">
                          {weightStacks[selectedExercise]
                            .filter(w => w !== parseFloat(weight))
                            .map(targetW => {
                              const eqReps = computeEquivalentReps(parseFloat(weight), parseInt(reps), targetW);
                              const isNext = targetW > parseFloat(weight) && !weightStacks[selectedExercise].some(w2 => w2 > parseFloat(weight) && w2 < targetW);
                              return (
                                <div key={targetW} className={`flex justify-between text-sm py-1 px-2 rounded ${isNext ? 'bg-green-500/10 border border-green-500/20' : ''}`}>
                                  <span className={isNext ? 'text-green-400 font-medium' : 'text-gray-400'}>{targetW}kg</span>
                                  <span className={isNext ? 'text-green-300 font-medium' : 'text-white'}>{eqReps ? `~${eqReps} reps` : 'Too heavy'}</span>
                                </div>
                              );
                            })}
                          <p className="text-xs text-gray-600 mt-2">Reps needed to match your current effort</p>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="submit" disabled={loading || !selectedExercise} className={btnPrimary}>
                    {loading ? 'Logging...' : 'Log Set'}
                  </button>
                </form>
              </div>

              {/* Panel 2: Calendar Grid */}
              <div className={`md:col-span-1 lg:col-span-1 ${cardClass}`}>
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

              {/* Panel 3: Today's Workout (grouped by exercise with edit/delete) */}
              <div className={`md:col-span-2 lg:col-span-2 ${cardClass} overflow-y-auto max-h-[600px]`}>
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
                            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                              <p className="font-semibold text-sm">
                                {exerciseName}
                                <span className="text-gray-400 ml-2 font-normal">
                                  ({sets.length} {sets.length === 1 ? 'set' : 'sets'})
                                </span>
                              </p>
                              {selectedCalendarDate === getLocalToday() && (
                                <button
                                  onClick={async () => {
                                    const lastSet = sets[sets.length - 1];
                                    // Optimistic update
                                    const optId = 'optimistic-' + Date.now();
                                    setSelectedDateWorkouts(prev => [...prev, {
                                      id: optId, exercise: exerciseName, exerciseId: lastSet.exerciseId,
                                      weight: lastSet.weight, reps: lastSet.reps, sets: 1,
                                    }]);
                                    setWorkoutDates(prev => new Set([...prev, getLocalToday()]));
                                    updateOverloadIncremental(lastSet.exerciseId, getLocalToday(), lastSet.weight, lastSet.reps);
                                    startRestTimer(restDuration);
                                    const result = await api.createWorkoutLog(user.id, lastSet.exerciseId, getLocalToday(), lastSet.weight, lastSet.reps);
                                    setSelectedDateWorkouts(prev => prev.map(w => w.id === optId ? { ...w, id: result.id } : w));
                                    const d = await api.fetchWorkoutDates(user.id);
                                    setWorkoutDates(d);
                                    setStreak(computeStreak(d));
                                    showToast('success', `${exerciseName}: ${lastSet.weight}kg x ${lastSet.reps}`);
                                  }}
                                  className="p-1 text-gray-500 hover:text-green-400 transition" title="Log another set">
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
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

              {/* Panel 4: Protein Log (full width) */}
            <div className={`md:col-span-2 lg:col-span-4 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-5">
                <Hash className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">Protein Log</h2>
                {proteinLogs.length > 0 && (
                  <span className="ml-auto text-lg font-bold text-blue-400">
                    {proteinLogs.reduce((sum, e) => sum + parseFloat(e.protein_grams), 0).toFixed(0)}g total
                  </span>
                )}
              </div>

              {/* Input row */}
              <div className="flex gap-3 mb-5">
                <input
                  type="text"
                  value={proteinInput}
                  onChange={e => setProteinInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !proteinParsing && logProtein()}
                  placeholder="e.g. 200g chicken breast, 2 eggs, Greek yogurt"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
                />
                <button
                  onClick={logProtein}
                  disabled={proteinParsing || !proteinInput.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition disabled:opacity-40 text-sm whitespace-nowrap flex items-center gap-2"
                >
                  {proteinParsing ? 'Parsing...' : <><Plus className="w-4 h-4" /> Log Protein</>}
                </button>
              </div>

              {/* Entries list */}
              {proteinLogs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  {selectedCalendarDate
                    ? `No protein logged on ${new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : 'Select a date or log protein for today'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {proteinLogs.map(entry => (
                    <div key={entry.id} className="bg-gray-900 rounded-lg border border-gray-700 px-4 py-3 flex items-center gap-3">
                      {editingProteinId === entry.id ? (
                        /* Edit mode */
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editProteinDesc}
                            onChange={e => setEditProteinDesc(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={editProteinGrams}
                            onChange={e => setEditProteinGrams(e.target.value)}
                            className="w-16 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-xs focus:outline-none focus:border-blue-500"
                            placeholder="g"
                          />
                          <button onClick={() => saveEditProtein(entry.id)}
                            className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEditProtein}
                            className="text-gray-400 hover:text-gray-300"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        /* Display mode */
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{entry.description}</p>
                          </div>
                          <span className="text-blue-400 font-bold text-sm whitespace-nowrap">
                            {parseFloat(entry.protein_grams).toFixed(0)}g
                          </span>
                          {deleteProteinConfirmId === entry.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-400">Delete?</span>
                              <button onClick={() => deleteProteinEntry(entry.id)}
                                className="text-red-400 hover:text-red-300"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteProteinConfirmId(null)}
                                className="text-gray-400 hover:text-gray-300"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditProtein(entry)}
                                className="p-1 text-gray-500 hover:text-blue-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteProteinConfirmId(entry.id)}
                                className="p-1 text-gray-500 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          )}
        </div>
      )}
      {/* ── Floating UI: Toast Notifications ── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium animate-fadeIn flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
            <span className="flex-1">{toast.message}</span>
            {toast.undoAction && (
              <button onClick={() => { toast.undoAction(); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}
                className="underline font-bold text-white/90 hover:text-white ml-2 flex-shrink-0">Undo</button>
            )}
          </div>
        ))}
      </div>

      {/* ── Floating UI: Rest Timer ── */}
      {restTimer && (
        <div className="fixed bottom-6 right-6 z-40 bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-2xl text-center min-w-[160px]">
          <p className="text-xs text-gray-400 mb-1">REST</p>
          <p className="text-4xl font-black text-yellow-400 tabular-nums">
            {Math.floor(restTimer.remaining / 60)}:{String(restTimer.remaining % 60).padStart(2, '0')}
          </p>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
            <div className="bg-yellow-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(restTimer.remaining / restTimer.total) * 100}%` }} />
          </div>
          <div className="flex gap-2 mt-3 justify-center">
            {[60, 90, 120, 180].map(s => (
              <button key={s} onClick={() => { setRestDuration(s); startRestTimer(s); }}
                className={`text-xs px-2 py-1 rounded transition ${restDuration === s ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {s}s
              </button>
            ))}
          </div>
          <button onClick={skipRestTimer} className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition">Skip</button>
        </div>
      )}

      {/* ── Floating UI: PR Celebration ── */}
      {prCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-yellow-500 text-gray-900 px-8 py-6 rounded-2xl shadow-2xl text-center animate-pr">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-2xl font-black">NEW PR!</h3>
            <p className="text-lg font-bold mt-1">{prCelebration.exerciseName}</p>
            <p className="text-xl font-black mt-1">
              {prCelebration.type === 'weight'
                ? `${prCelebration.weight}kg x ${prCelebration.reps}`
                : `Est. 1RM: ${prCelebration.value}kg`}
            </p>
          </div>
        </div>
      )}

      {/* Click-outside handler for exercise search dropdown */}
      {showExerciseDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowExerciseDropdown(false)} />
      )}
    </div>
  );
};

export default WorkoutApp;
