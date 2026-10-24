-- Quarterly (every 3 months) and every 4 months, on repeating items and plan schedules.

ALTER TABLE public.recurring_items DROP CONSTRAINT IF EXISTS recurring_items_cadence_check;
ALTER TABLE public.recurring_items
  ADD CONSTRAINT recurring_items_cadence_check
  CHECK (
    cadence IN (
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
      'quarterly',
      'every4months',
      'semiannual',
      'yearly'
    )
  );

ALTER TABLE public.budget_plan_schedules DROP CONSTRAINT IF EXISTS budget_plan_schedules_cadence_check;
ALTER TABLE public.budget_plan_schedules
  ADD CONSTRAINT budget_plan_schedules_cadence_check
  CHECK (
    cadence IS NULL
    OR cadence IN (
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
      'quarterly',
      'every4months',
      'semiannual',
      'yearly'
    )
  );
