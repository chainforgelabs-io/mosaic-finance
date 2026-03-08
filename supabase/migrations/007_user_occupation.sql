-- Add occupation field for primary user (to match household members)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
