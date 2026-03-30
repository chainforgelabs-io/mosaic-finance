-- ============================================================
-- Mosaic Finance — Performance Indexes
-- Migration 003: Without these, approval queue and conversation
-- lookups will table-scan at scale
-- ============================================================

CREATE INDEX idx_approval_queue_status_sla
  ON approval_queue(status, sla_deadline);

CREATE INDEX idx_approval_queue_plan_id
  ON approval_queue(plan_id);

CREATE INDEX idx_financial_plans_user_status
  ON financial_plans(user_id, status);

CREATE INDEX idx_conversation_sessions_user
  ON conversation_sessions(user_id, session_type);

CREATE INDEX idx_conversation_messages_session
  ON conversation_messages(session_id, created_at);

CREATE INDEX idx_financial_profiles_user
  ON financial_profiles(user_id);

CREATE INDEX idx_investment_holdings_user
  ON investment_holdings(user_id);

CREATE INDEX idx_risk_profiles_user
  ON risk_profiles(user_id);

CREATE INDEX idx_document_uploads_user
  ON document_uploads(user_id);
