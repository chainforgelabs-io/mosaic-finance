-- Allow users to read their own financial plans in any status (generating, pending_review, delivered).
-- Replaces user_read_delivered_plans so users can see plan generation progress and pending review status.

DROP POLICY IF EXISTS "user_read_delivered_plans" ON public.financial_plans;

CREATE POLICY "user_read_own_plans"
  ON public.financial_plans FOR SELECT
  USING (auth.uid() = user_id);
