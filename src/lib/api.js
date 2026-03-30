import { supabase } from './supabase';

// ─── Exercises ──────────────────────────────────────────────

/**
 * Fetch all exercises from the catalog.
 */
export async function fetchExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, slug, primary_muscle, secondary_muscles, equipment, movement_pattern, exercise_type, difficulty, is_unilateral')
    .order('name');
  if (error) throw error;
  return data;
}

/**
 * Create a new exercise in the catalog.
 */
export async function createExercise(userId, name, primaryMuscle) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: name.trim(),
      slug,
      primary_muscle: primaryMuscle || null,
      created_by: userId,
    })
    .select('id, name, slug, primary_muscle, secondary_muscles, equipment, movement_pattern, exercise_type, difficulty, is_unilateral')
    .single();
  if (error) throw error;
  return data;
}

// ─── Exercise Logs ──────────────────────────────────────────

/**
 * Fetch distinct dates that have workout logs for a user.
 * RLS ensures only the current user's data is returned.
 */
export async function fetchWorkoutDates(userId) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('date')
    .eq('user_id', userId);
  if (error) throw error;
  // Extract unique dates
  const dates = new Set(data.map(row => row.date));
  return dates;
}

/**
 * Fetch workouts for a specific date, joined with exercise names.
 */
export async function fetchWorkoutsForDate(userId, date) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select(`
      id,
      weight_kg,
      reps,
      sets,
      exercise_id,
      exercises ( name )
    `)
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at');
  if (error) throw error;
  // Flatten the join
  return data.map(row => ({
    id: row.id,
    exercise: row.exercises?.name || 'Unknown',
    exerciseId: row.exercise_id,
    weight: row.weight_kg,
    reps: row.reps,
    sets: row.sets,
  }));
}

/**
 * Create a single workout log entry.
 * mesoParams is optional: { targetWeight, targetReps, rirTarget, setStatus, mesoWeek }
 */
export async function createWorkoutLog(userId, exerciseId, date, weightKg, reps, mesoParams = {}) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .insert({
      user_id: userId,
      exercise_id: exerciseId,
      date,
      weight_kg: weightKg,
      reps,
      sets: 1,
      ...(mesoParams.targetWeight != null && { target_weight: mesoParams.targetWeight }),
      ...(mesoParams.targetReps != null && { target_reps: mesoParams.targetReps }),
      ...(mesoParams.rirTarget != null && { rir_target: mesoParams.rirTarget }),
      ...(mesoParams.setStatus != null && { set_status: mesoParams.setStatus }),
      ...(mesoParams.mesoWeek != null && { meso_week: mesoParams.mesoWeek }),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update weight and reps for an existing log entry.
 */
export async function updateWorkoutLog(id, weightKg, reps) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .update({ weight_kg: weightKg, reps })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a workout log entry.
 */
export async function deleteWorkoutLog(id) {
  const { error } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Fetch all logs for a user (for progressive overload computation).
 */
export async function fetchAllUserLogs(userId) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('date, exercise_id, weight_kg, reps, created_at')
    .eq('user_id', userId)
    .order('date');
  if (error) throw error;
  return data;
}

/**
 * Bulk-create workout logs (for import feature).
 * Supabase supports bulk insert natively — no chunking needed.
 */
export async function bulkCreateWorkoutLogs(records) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .insert(records)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Fetch the most recent set per exercise for smart defaults.
 * Returns a map of exerciseId -> { weight, reps }.
 */
export async function fetchLastSetsForAllExercises(userId) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('exercise_id, weight_kg, reps')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  const map = {};
  (data || []).forEach(row => {
    if (!map[row.exercise_id]) {
      map[row.exercise_id] = { weight: row.weight_kg, reps: row.reps };
    }
  });
  return map;
}

/**
 * Fetch logs within a date range (for weekly summaries).
 */
export async function fetchLogsForDateRange(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('date, weight_kg, reps, exercise_id')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return data;
}

// ─── Workout Templates ──────────────────────────────────────

/**
 * Fetch all templates for a user, including their exercises.
 */
export async function fetchTemplates(userId) {
  const { data, error } = await supabase
    .from('workout_templates')
    .select(`
      id,
      name,
      created_at,
      template_exercises (
        id,
        exercise_id,
        sort_order,
        sets
      )
    `)
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return data.map(t => {
    const sorted = (t.template_exercises || []).sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: t.id,
      name: t.name,
      exercises: sorted.map(te => ({ exerciseId: te.exercise_id, sets: te.sets || 3 })),
      exerciseIds: sorted.map(te => te.exercise_id),
    };
  });
}

/**
 * Create a new workout template with its exercises.
 */
export async function createTemplate(userId, name, exerciseData) {
  const { data: template, error: tErr } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (tErr) throw tErr;

  if (exerciseData.length > 0) {
    const rows = exerciseData.map((item, idx) => {
      const isObj = typeof item === 'object';
      return {
        template_id: template.id,
        exercise_id: isObj ? item.exerciseId : item,
        sort_order: idx,
        sets: isObj ? (item.sets || 3) : 3,
      };
    });
    const { error: teErr } = await supabase
      .from('template_exercises')
      .insert(rows);
    if (teErr) throw teErr;
  }

  return template;
}

/**
 * Update a template's name and exercises.
 */
export async function updateTemplate(templateId, name, exerciseData) {
  const { error: tErr } = await supabase
    .from('workout_templates')
    .update({ name })
    .eq('id', templateId);
  if (tErr) throw tErr;

  const { error: delErr } = await supabase
    .from('template_exercises')
    .delete()
    .eq('template_id', templateId);
  if (delErr) throw delErr;

  if (exerciseData.length > 0) {
    const rows = exerciseData.map((item, idx) => {
      const isObj = typeof item === 'object';
      return {
        template_id: templateId,
        exercise_id: isObj ? item.exerciseId : item,
        sort_order: idx,
        sets: isObj ? (item.sets || 3) : 3,
      };
    });
    const { error: teErr } = await supabase
      .from('template_exercises')
      .insert(rows);
    if (teErr) throw teErr;
  }
}

/**
 * Delete a template (cascade deletes template_exercises).
 */
export async function deleteTemplate(templateId) {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
}

// ─── Protein Logs ────────────────────────────────────────────

/**
 * Fetch protein logs for a specific date.
 */
export async function fetchProteinLogsForDate(userId, date) {
  const { data, error } = await supabase
    .from('protein_logs')
    .select('id, description, protein_grams, source_text, created_at')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at');
  if (error) throw error;
  return data;
}

/**
 * Fetch all protein log dates for a user (for calendar display).
 */
export async function fetchProteinDates(userId) {
  const { data, error } = await supabase
    .from('protein_logs')
    .select('date')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set(data.map(row => row.date));
}

/**
 * Bulk-create protein log entries.
 */
export async function createProteinLogs(userId, date, entries) {
  const records = entries.map(e => ({
    user_id: userId,
    date,
    description: e.description,
    protein_grams: e.protein_grams,
    source_text: e.source_text || null,
  }));
  const { data, error } = await supabase
    .from('protein_logs')
    .insert(records)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Update a protein log entry.
 */
export async function updateProteinLog(id, description, proteinGrams) {
  const { data, error } = await supabase
    .from('protein_logs')
    .update({ description, protein_grams: proteinGrams })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a protein log entry.
 */
export async function deleteProteinLog(id) {
  const { error } = await supabase
    .from('protein_logs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Mesocycle API ─────────────────────────────────────────

/**
 * Create a new mesocycle.
 */
export async function createMesocycle(userId, name, numWeeks, startDate, rirSchedule) {
  const { data, error } = await supabase
    .from('mesocycles')
    .insert({
      user_id: userId,
      name,
      num_weeks: numWeeks,
      start_date: startDate,
      rir_schedule: rirSchedule,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch the active mesocycle for a user, plus its day schedule.
 * Returns { meso, schedule } or null if none active.
 */
export async function fetchActiveMesocycle(userId) {
  const { data: meso, error } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!meso) return null;

  const { data: schedule, error: schedErr } = await supabase
    .from('meso_schedule')
    .select('day_of_week, template_id')
    .eq('mesocycle_id', meso.id);
  if (schedErr) throw schedErr;

  return { meso, schedule: schedule || [] };
}

/**
 * Save day-of-week → template mappings for a meso (full replace).
 * entries: [{ day_of_week, template_id }]
 */
export async function setMesoSchedule(mesocycleId, entries) {
  // Delete existing
  await supabase.from('meso_schedule').delete().eq('mesocycle_id', mesocycleId);
  if (!entries.length) return;
  const rows = entries.map(e => ({ mesocycle_id: mesocycleId, ...e }));
  const { error } = await supabase.from('meso_schedule').insert(rows);
  if (error) throw error;
}

/**
 * Update mesocycle status (complete / deload / cancel).
 */
export async function updateMesocycleStatus(mesoId, status) {
  const { error } = await supabase
    .from('mesocycles')
    .update({ status })
    .eq('id', mesoId);
  if (error) throw error;
}

/**
 * Fetch all mesocycles for a user (for history view).
 */
export async function fetchAllMesocycles(userId) {
  const { data, error } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
