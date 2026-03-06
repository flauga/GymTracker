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
 */
export async function createWorkoutLog(userId, exerciseId, date, weightKg, reps) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .insert({
      user_id: userId,
      exercise_id: exerciseId,
      date,
      weight_kg: weightKg,
      reps,
      sets: 1,
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
    .select('date, exercise_id, weight_kg, reps')
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
        sort_order
      )
    `)
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  // Normalize: extract exerciseIds sorted by sort_order
  return data.map(t => ({
    id: t.id,
    name: t.name,
    exerciseIds: (t.template_exercises || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(te => te.exercise_id),
  }));
}

/**
 * Create a new workout template with its exercises.
 */
export async function createTemplate(userId, name, exerciseIds) {
  // Create the template
  const { data: template, error: tErr } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (tErr) throw tErr;

  // Create the template exercises
  if (exerciseIds.length > 0) {
    const rows = exerciseIds.map((exId, idx) => ({
      template_id: template.id,
      exercise_id: exId,
      sort_order: idx,
    }));
    const { error: teErr } = await supabase
      .from('template_exercises')
      .insert(rows);
    if (teErr) throw teErr;
  }

  return { ...template, exerciseIds };
}

/**
 * Update a template's name and exercises.
 */
export async function updateTemplate(templateId, name, exerciseIds) {
  // Update name
  const { error: tErr } = await supabase
    .from('workout_templates')
    .update({ name })
    .eq('id', templateId);
  if (tErr) throw tErr;

  // Replace exercises: delete old, insert new
  const { error: delErr } = await supabase
    .from('template_exercises')
    .delete()
    .eq('template_id', templateId);
  if (delErr) throw delErr;

  if (exerciseIds.length > 0) {
    const rows = exerciseIds.map((exId, idx) => ({
      template_id: templateId,
      exercise_id: exId,
      sort_order: idx,
    }));
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
