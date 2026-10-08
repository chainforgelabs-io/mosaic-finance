-- Budget planning: a month-by-month plan for income, expenses, and savings,
-- a per-user category catalog, and a savings role for logged transactions.

-- Savings are money set aside (TFSA, RRSP, cash savings, extra debt principal).
-- They leave the bank like a purchase but never count as spending.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_line_role_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_line_role_check
  CHECK (line_role IN ('purchase', 'income', 'card_payment', 'transfer', 'fee', 'interest', 'savings'));

CREATE TABLE IF NOT EXISTS public.budget_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'savings')),
  category TEXT NOT NULL CHECK (category ~ '^[a-z][a-z0-9_]{0,39}$'),
  month DATE NOT NULL CHECK (month = date_trunc('month', month)::date),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, kind, category, month)
);

CREATE INDEX IF NOT EXISTS budget_plan_entries_user_month_idx
  ON public.budget_plan_entries (user_id, month);

ALTER TABLE public.budget_plan_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budget plan" ON public.budget_plan_entries;
CREATE POLICY "Users manage own budget plan"
  ON public.budget_plan_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_budget_plan_entries_updated_at ON public.budget_plan_entries;
CREATE TRIGGER set_budget_plan_entries_updated_at
  BEFORE UPDATE ON public.budget_plan_entries
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

COMMENT ON TABLE public.budget_plan_entries IS
  'Planned amount per category per calendar month. Expense rows override category_budgets.monthly_limit for that month.';

CREATE TABLE IF NOT EXISTS public.user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_]{0,39}$'),
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'savings')),
  is_need BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS user_categories_user_idx
  ON public.user_categories (user_id);

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own categories" ON public.user_categories;
CREATE POLICY "Users manage own categories"
  ON public.user_categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_categories_updated_at ON public.user_categories;
CREATE TRIGGER set_user_categories_updated_at
  BEFORE UPDATE ON public.user_categories
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

COMMENT ON TABLE public.user_categories IS
  'Custom categories and overrides of the built-in list. Built-in categories live in code; a row with a built-in slug can rename or archive it.';
