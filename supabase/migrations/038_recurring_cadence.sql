-- Repeating income, expenses, and savings can be weekly through yearly.
-- line_role keeps a savings transfer from being posted as spending.

ALTER TABLE public.recurring_items DROP CONSTRAINT IF EXISTS recurring_items_cadence_check;
ALTER TABLE public.recurring_items
  ADD CONSTRAINT recurring_items_cadence_check
  CHECK (cadence IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'semiannual', 'yearly'));

ALTER TABLE public.recurring_items
  ADD COLUMN IF NOT EXISTS line_role TEXT;

ALTER TABLE public.recurring_items DROP CONSTRAINT IF EXISTS recurring_items_line_role_check;
ALTER TABLE public.recurring_items
  ADD CONSTRAINT recurring_items_line_role_check
  CHECK (line_role IS NULL OR line_role IN ('purchase', 'income', 'savings'));

COMMENT ON COLUMN public.recurring_items.line_role IS
  'How a confirmed occurrence is tagged. Null means income when direction is in, otherwise a purchase.';
