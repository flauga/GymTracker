-- ============================================================
-- Migration: Update exercises table to new schema
-- Adds: slug, equipment, movement_pattern, exercise_type,
--        difficulty, is_unilateral, image_path, instructions
-- Renames: primary_muscles -> primary_muscle, type -> exercise_type
-- ============================================================

-- Drop all existing exercises (will be re-seeded)
TRUNCATE exercises CASCADE;

-- Remove old columns
ALTER TABLE exercises DROP COLUMN IF EXISTS type;
ALTER TABLE exercises DROP COLUMN IF EXISTS primary_muscles;
ALTER TABLE exercises DROP COLUMN IF EXISTS secondary_muscles;

-- Add new columns
ALTER TABLE exercises ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE exercises ADD COLUMN primary_muscle TEXT;
ALTER TABLE exercises ADD COLUMN secondary_muscles JSONB DEFAULT '{}';
ALTER TABLE exercises ADD COLUMN equipment TEXT;
ALTER TABLE exercises ADD COLUMN movement_pattern TEXT;
ALTER TABLE exercises ADD COLUMN exercise_type TEXT;
ALTER TABLE exercises ADD COLUMN difficulty TEXT;
ALTER TABLE exercises ADD COLUMN is_unilateral BOOLEAN DEFAULT false;
ALTER TABLE exercises ADD COLUMN image_path TEXT;
ALTER TABLE exercises ADD COLUMN instructions TEXT;

-- Drop the old unique constraint on name (if exists) and re-add
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_key;
ALTER TABLE exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);
