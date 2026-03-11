-- ============================================================
-- Migration 003: Protein Logs + Slack Integration
-- ============================================================

-- 1. Add slack_user_id to profiles (replaces whatsapp_linked/phone)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_user_id TEXT;

-- 2. Protein logs table
CREATE TABLE IF NOT EXISTS protein_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  protein_grams DECIMAL(6,1) NOT NULL,
  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_protein_logs_user_date ON protein_logs(user_id, date);

-- RLS
ALTER TABLE protein_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own protein logs" ON protein_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own protein logs" ON protein_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own protein logs" ON protein_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own protein logs" ON protein_logs
  FOR DELETE USING (auth.uid() = user_id);
