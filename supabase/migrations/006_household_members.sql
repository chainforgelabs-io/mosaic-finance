-- Household members table for multi-person financial planning
CREATE TABLE IF NOT EXISTS household_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'other')),
  age INTEGER CHECK (age >= 0 AND age <= 120),
  sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer-not-to-say')),
  occupation TEXT,
  annual_income NUMERIC(12, 2) DEFAULT 0,
  is_dependant BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add sex and annual_income to user_profiles for the primary client
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer-not-to-say'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS annual_income NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- RLS
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own household members"
  ON household_members FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);

-- Add new session types for annual-review and ad-hoc meetings
ALTER TABLE conversation_sessions DROP CONSTRAINT IF EXISTS valid_session_type;
ALTER TABLE conversation_sessions ADD CONSTRAINT valid_session_type CHECK (session_type IN (
  'fact-find', 'risk-profile', 'walkthrough', 'followup', 'annual-review', 'ad-hoc'
));
