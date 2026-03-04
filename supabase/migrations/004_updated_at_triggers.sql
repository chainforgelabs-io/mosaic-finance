-- ============================================================
-- Finova AI — Auto-update Triggers
-- Migration 004: Without this, updated_at always equals created_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_modtime
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_financial_profiles_modtime
  BEFORE UPDATE ON financial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_conversation_sessions_modtime
  BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_investment_holdings_modtime
  BEFORE UPDATE ON investment_holdings
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_financial_plans_modtime
  BEFORE UPDATE ON financial_plans
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
