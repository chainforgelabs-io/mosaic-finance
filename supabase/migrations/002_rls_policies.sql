-- ============================================================
-- Mosaic Finance — Row-Level Security Policies
-- Migration 002: RLS is the compliance backbone of this application
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- User-owned data policies
-- Users can only see/edit their own data
-- ============================================================

CREATE POLICY "user_own_data"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "user_own_financial_profile"
  ON public.financial_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_conversations"
  ON public.conversation_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_messages"
  ON public.conversation_messages FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_holdings"
  ON public.investment_holdings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_risk_profile"
  ON public.risk_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_uploads"
  ON public.document_uploads FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- Plan visibility: users can ONLY read delivered plans
-- This is a non-negotiable compliance requirement.
-- Plans in pending_review/approved/rejected are never visible to users.
-- ============================================================

CREATE POLICY "user_read_delivered_plans"
  ON public.financial_plans FOR SELECT
  USING (auth.uid() = user_id AND status = 'delivered');

-- ============================================================
-- CIM reviewer policies
-- Reviewers (role = 'cim_reviewer') can access the approval queue
-- and read/update all plans for review purposes.
-- ============================================================

CREATE POLICY "cim_read_queue"
  ON public.approval_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'cim_reviewer'
    )
  );

CREATE POLICY "cim_read_plans_for_review"
  ON public.financial_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'cim_reviewer'
    )
  );

CREATE POLICY "cim_update_plans"
  ON public.financial_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'cim_reviewer'
    )
  );
