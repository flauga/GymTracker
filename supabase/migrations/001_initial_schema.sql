-- ============================================================
-- GymTrackerApp: Initial Schema Migration
-- Database: Supabase (PostgreSQL)
-- ============================================================

-- 1. User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone TEXT,
  display_name TEXT,
  whatsapp_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Exercises (reference data — replaces Airtable "List of Exercises")
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT,
  primary_muscles TEXT,
  secondary_muscles TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Exercise logs (replaces Airtable "Exercise Log")
CREATE TABLE exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  date DATE NOT NULL,
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  sets INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Workout templates (replaces localStorage templates)
CREATE TABLE workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Template exercises (junction table)
CREATE TABLE template_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, date);
CREATE INDEX idx_exercise_logs_user ON exercise_logs(user_id);
CREATE INDEX idx_template_exercises_template ON template_exercises(template_id);

-- ─── Row-Level Security ────────────────────────────────────

-- Exercises: anyone can read
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exercises" ON exercises
  FOR SELECT USING (true);

-- Profiles: users own their profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Exercise logs: users own their data
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON exercise_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON exercise_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON exercise_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON exercise_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Templates: users own their templates
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own templates" ON workout_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON workout_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON workout_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Template exercises: accessible via template ownership
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own template exercises" ON template_exercises
  FOR SELECT USING (
    template_id IN (SELECT id FROM workout_templates WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own template exercises" ON template_exercises
  FOR INSERT WITH CHECK (
    template_id IN (SELECT id FROM workout_templates WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own template exercises" ON template_exercises
  FOR UPDATE USING (
    template_id IN (SELECT id FROM workout_templates WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own template exercises" ON template_exercises
  FOR DELETE USING (
    template_id IN (SELECT id FROM workout_templates WHERE user_id = auth.uid())
  );

-- ─── Auto-create profile on signup ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Auto-update updated_at on exercise_logs ──────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_logs_updated_at
  BEFORE UPDATE ON exercise_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
