-- ============================================================
-- Migration 005: Mesocycle Tracking
-- ============================================================

-- Table: mesocycles
CREATE TABLE IF NOT EXISTS mesocycles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  num_weeks    INTEGER NOT NULL DEFAULT 8 CHECK (num_weeks >= 4 AND num_weeks <= 16),
  start_date   DATE NOT NULL,
  rir_schedule JSONB NOT NULL,   -- e.g. [3,2,2,2,2,2,1,0]
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','completed','deload','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mesocycles" ON mesocycles
  FOR ALL USING (auth.uid() = user_id);

-- Table: meso_schedule (maps day of week to a workout template)
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
CREATE TABLE IF NOT EXISTS meso_schedule (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mesocycle_id  UUID REFERENCES mesocycles(id) ON DELETE CASCADE NOT NULL,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  template_id   UUID REFERENCES workout_templates(id) ON DELETE SET NULL
);

ALTER TABLE meso_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meso_schedule" ON meso_schedule
  FOR ALL USING (
    mesocycle_id IN (SELECT id FROM mesocycles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_meso_schedule_meso ON meso_schedule(mesocycle_id);
CREATE INDEX IF NOT EXISTS idx_mesocycles_user ON mesocycles(user_id);

-- Extend exercise_logs with meso tracking columns (all nullable — backward compatible)
ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS target_weight  DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS target_reps    INTEGER,
  ADD COLUMN IF NOT EXISTS rir_target     INTEGER,
  ADD COLUMN IF NOT EXISTS set_status     TEXT CHECK (set_status IN ('met','exceeded','missed')),
  ADD COLUMN IF NOT EXISTS meso_week      INTEGER;
