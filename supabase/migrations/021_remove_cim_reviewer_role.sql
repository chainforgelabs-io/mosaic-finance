-- ============================================================
-- Mosaic Finance — Remove cim_reviewer role (merge into admin)
-- Migration 021: Only user | admin remain
-- ============================================================

UPDATE public.user_profiles
SET role = 'admin'
WHERE role = 'cim_reviewer';

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS valid_role;

ALTER TABLE public.user_profiles ADD CONSTRAINT valid_role
  CHECK (role IN ('user', 'admin'));

-- RLS: approval queue and plan review access for admin only
DROP POLICY IF EXISTS "cim_read_queue" ON public.approval_queue;
DROP POLICY IF EXISTS "cim_read_plans_for_review" ON public.financial_plans;
DROP POLICY IF EXISTS "cim_update_plans" ON public.financial_plans;

CREATE POLICY "admin_read_queue"
  ON public.approval_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_read_plans_for_review"
  ON public.financial_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_plans"
  ON public.financial_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
