-- ============================================================
-- Mosaic Finance — Waitlist signups (validation / marketing)
-- ============================================================

CREATE TABLE public.waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  province TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX idx_waitlist_signups_created_at ON public.waitlist_signups (created_at DESC);

COMMENT ON TABLE public.waitlist_signups IS 'Public waitlist emails; no auth required to insert.';

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anonymous and logged-in visitors can join the waitlist (server uses anon key).
CREATE POLICY "waitlist_insert_anon"
  ON public.waitlist_signups
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "waitlist_insert_authenticated"
  ON public.waitlist_signups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE for anon or authenticated; use service role in dashboard/SQL.
