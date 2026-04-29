-- Allow marking prior plans as superseded when client reapplies data after an annual review and regenerates.

ALTER TABLE public.financial_plans DROP CONSTRAINT IF EXISTS valid_plan_status;
ALTER TABLE public.financial_plans ADD CONSTRAINT valid_plan_status
  CHECK (status IN (
    'generating',
    'failed',
    'pending_review',
    'approved',
    'rejected',
    'delivered',
    'superseded'
  ));
