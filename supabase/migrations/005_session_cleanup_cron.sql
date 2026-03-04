-- ============================================================
-- Finova AI — Session Cleanup Cron Job
-- Migration 005: Mark conversations as abandoned after 7 days
-- of inactivity. Requires pg_cron extension enabled in Supabase
-- dashboard (Database > Extensions).
-- ============================================================

SELECT cron.schedule(
  'cleanup-abandoned-sessions',
  '0 3 * * *',  -- Daily at 3 AM UTC
  $$
    UPDATE conversation_sessions
    SET status = 'abandoned'
    WHERE status = 'active'
    AND last_activity_at < NOW() - INTERVAL '7 days';
  $$
);
