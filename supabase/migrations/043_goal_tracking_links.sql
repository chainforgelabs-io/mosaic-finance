-- Goals can watch net-worth accounts and plan lines, and keep the class the person confirmed.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS tracking_class TEXT,
  ADD COLUMN IF NOT EXISTS linked_account_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_plan_categories TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_tracking_class_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_tracking_class_check
  CHECK (
    tracking_class IS NULL
    OR tracking_class IN ('balance', 'debt', 'retirement_age', 'retirement_income', 'note')
  );

COMMENT ON COLUMN public.goals.tracking_class IS
  'How the goal is measured. Null means the app infers a class from the name.';
COMMENT ON COLUMN public.goals.linked_account_ids IS
  'Net-worth snapshot line ids this goal watches.';
COMMENT ON COLUMN public.goals.linked_plan_categories IS
  'Cash-flow plan category slugs logged toward this goal.';
