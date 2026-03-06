-- ============================================================
-- Seed: Exercise catalog
-- Run this after the migration to populate the exercises table.
-- ============================================================

INSERT INTO exercises (name, type, primary_muscles, secondary_muscles) VALUES
  -- Chest
  ('Bench Press', 'Compound', 'Chest', 'Triceps, Shoulders'),
  ('Incline Bench Press', 'Compound', 'Upper Chest', 'Triceps, Shoulders'),
  ('Decline Bench Press', 'Compound', 'Lower Chest', 'Triceps, Shoulders'),
  ('Dumbbell Bench Press', 'Compound', 'Chest', 'Triceps, Shoulders'),
  ('Incline Dumbbell Press', 'Compound', 'Upper Chest', 'Triceps, Shoulders'),
  ('Chest Fly', 'Isolation', 'Chest', 'Shoulders'),
  ('Cable Crossover', 'Isolation', 'Chest', 'Shoulders'),
  ('Push-Up', 'Compound', 'Chest', 'Triceps, Shoulders, Core'),
  ('Dips (Chest)', 'Compound', 'Chest', 'Triceps, Shoulders'),

  -- Back
  ('Deadlift', 'Compound', 'Back', 'Hamstrings, Glutes, Core'),
  ('Barbell Row', 'Compound', 'Back', 'Biceps, Rear Delts'),
  ('Dumbbell Row', 'Compound', 'Back', 'Biceps, Rear Delts'),
  ('Pull-Up', 'Compound', 'Back', 'Biceps, Core'),
  ('Chin-Up', 'Compound', 'Back', 'Biceps'),
  ('Lat Pulldown', 'Compound', 'Back', 'Biceps'),
  ('Seated Cable Row', 'Compound', 'Back', 'Biceps, Rear Delts'),
  ('T-Bar Row', 'Compound', 'Back', 'Biceps, Rear Delts'),
  ('Face Pull', 'Isolation', 'Rear Delts', 'Traps, Rotator Cuff'),

  -- Shoulders
  ('Overhead Press', 'Compound', 'Shoulders', 'Triceps, Upper Chest'),
  ('Dumbbell Shoulder Press', 'Compound', 'Shoulders', 'Triceps'),
  ('Lateral Raise', 'Isolation', 'Shoulders', NULL),
  ('Front Raise', 'Isolation', 'Front Delts', NULL),
  ('Reverse Fly', 'Isolation', 'Rear Delts', 'Traps'),
  ('Arnold Press', 'Compound', 'Shoulders', 'Triceps'),
  ('Shrugs', 'Isolation', 'Traps', NULL),
  ('Upright Row', 'Compound', 'Shoulders', 'Traps'),

  -- Arms
  ('Barbell Curl', 'Isolation', 'Biceps', 'Forearms'),
  ('Dumbbell Curl', 'Isolation', 'Biceps', 'Forearms'),
  ('Hammer Curl', 'Isolation', 'Biceps', 'Forearms'),
  ('Preacher Curl', 'Isolation', 'Biceps', NULL),
  ('Concentration Curl', 'Isolation', 'Biceps', NULL),
  ('Tricep Pushdown', 'Isolation', 'Triceps', NULL),
  ('Skull Crushers', 'Isolation', 'Triceps', NULL),
  ('Overhead Tricep Extension', 'Isolation', 'Triceps', NULL),
  ('Dips (Triceps)', 'Compound', 'Triceps', 'Chest, Shoulders'),
  ('Close-Grip Bench Press', 'Compound', 'Triceps', 'Chest, Shoulders'),

  -- Legs
  ('Squat', 'Compound', 'Quadriceps', 'Glutes, Hamstrings, Core'),
  ('Front Squat', 'Compound', 'Quadriceps', 'Glutes, Core'),
  ('Leg Press', 'Compound', 'Quadriceps', 'Glutes, Hamstrings'),
  ('Lunges', 'Compound', 'Quadriceps', 'Glutes, Hamstrings'),
  ('Bulgarian Split Squat', 'Compound', 'Quadriceps', 'Glutes, Hamstrings'),
  ('Leg Extension', 'Isolation', 'Quadriceps', NULL),
  ('Leg Curl', 'Isolation', 'Hamstrings', NULL),
  ('Romanian Deadlift', 'Compound', 'Hamstrings', 'Glutes, Lower Back'),
  ('Hip Thrust', 'Compound', 'Glutes', 'Hamstrings'),
  ('Calf Raise', 'Isolation', 'Calves', NULL),
  ('Hack Squat', 'Compound', 'Quadriceps', 'Glutes'),

  -- Core
  ('Plank', 'Isolation', 'Core', NULL),
  ('Hanging Leg Raise', 'Isolation', 'Core', 'Hip Flexors'),
  ('Cable Crunch', 'Isolation', 'Core', NULL),
  ('Russian Twist', 'Isolation', 'Core', 'Obliques'),
  ('Ab Wheel Rollout', 'Isolation', 'Core', 'Shoulders'),

  -- Full Body / Olympic
  ('Clean and Jerk', 'Compound', 'Full Body', NULL),
  ('Snatch', 'Compound', 'Full Body', NULL),
  ('Power Clean', 'Compound', 'Full Body', NULL),
  ('Kettlebell Swing', 'Compound', 'Glutes', 'Hamstrings, Core, Shoulders'),
  ('Farmer''s Walk', 'Compound', 'Grip', 'Core, Traps, Shoulders')
ON CONFLICT (name) DO NOTHING;
