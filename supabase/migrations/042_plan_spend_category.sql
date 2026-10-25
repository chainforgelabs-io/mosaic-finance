-- Groups a named plan line (SGI Personal Auto) under a spending category (Insurance).
-- Null until the person chooses one. Logged spending can still use Flex/Misc with no plan line.

ALTER TABLE public.budget_plan_schedules
  ADD COLUMN IF NOT EXISTS spend_category TEXT;

ALTER TABLE public.budget_plan_schedules
  DROP CONSTRAINT IF EXISTS budget_plan_schedules_spend_category_check;

ALTER TABLE public.budget_plan_schedules
  ADD CONSTRAINT budget_plan_schedules_spend_category_check
  CHECK (
    spend_category IS NULL
    OR spend_category IN (
      'housing',
      'groceries',
      'dining',
      'transportation',
      'utilities',
      'subscriptions',
      'insurance',
      'health',
      'entertainment',
      'shopping',
      'travel',
      'kids',
      'gifts_donations',
      'debt_payments',
      'condo_fees',
      'other'
    )
  );

COMMENT ON COLUMN public.budget_plan_schedules.spend_category IS
  'Spending category for an expense line. Null for income, savings, and lines not yet grouped.';
