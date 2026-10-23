-- Remember the amount, cadence, and last payment date that fill a plan row.

CREATE TABLE IF NOT EXISTS public.budget_plan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'savings')),
  category TEXT NOT NULL CHECK (category ~ '^[a-z][a-z0-9_]{0,39}$'),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  basis TEXT NOT NULL CHECK (basis IN ('each', 'year')),
  cadence TEXT CHECK (
    cadence IS NULL
    OR cadence IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'semiannual', 'yearly')
  ),
  anchor_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, kind, category)
);

CREATE INDEX IF NOT EXISTS budget_plan_schedules_user_idx
  ON public.budget_plan_schedules (user_id);

ALTER TABLE public.budget_plan_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budget plan schedules" ON public.budget_plan_schedules;
CREATE POLICY "Users manage own budget plan schedules"
  ON public.budget_plan_schedules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_budget_plan_schedules_updated_at ON public.budget_plan_schedules;
CREATE TRIGGER set_budget_plan_schedules_updated_at
  BEFORE UPDATE ON public.budget_plan_schedules
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

COMMENT ON TABLE public.budget_plan_schedules IS
  'Inputs that fill budget_plan_entries. Null cadence is a flat monthly envelope. Monthly rows omit the date.';
