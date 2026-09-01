-- ============================================================
-- Mosaic Finance — Cash flow, net worth history, goals, gamification
-- Migration 026
-- ============================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  txn_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL CHECK (category IN (
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
    'other'
  )),
  description TEXT,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'screenshot')),
  document_id UUID REFERENCES public.document_uploads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX transactions_user_date_idx
  ON public.transactions (user_id, txn_date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================

CREATE TABLE public.net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  snapshot_date DATE NOT NULL,
  investments_total NUMERIC NOT NULL DEFAULT 0,
  fixed_assets_total NUMERIC NOT NULL DEFAULT 0,
  debts_total NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX net_worth_snapshots_user_month_idx
  ON public.net_worth_snapshots (
    user_id,
    (date_trunc('month', snapshot_date::timestamp))
  );

CREATE INDEX net_worth_snapshots_user_date_idx
  ON public.net_worth_snapshots (user_id, snapshot_date DESC);

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own net worth snapshots"
  ON public.net_worth_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_net_worth_snapshots_updated_at
  BEFORE UPDATE ON public.net_worth_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'emergency_fund',
    'debt_payoff',
    'home_purchase',
    'retirement',
    'education',
    'vacation',
    'vehicle',
    'wedding',
    'savings',
    'other'
  )),
  target_amount NUMERIC,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'archived')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('onboarding', 'fact_find', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX goals_user_status_idx
  ON public.goals (user_id, status);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  achievement_key TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX user_achievements_user_key_idx
  ON public.user_achievements (user_id, achievement_key);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own achievements"
  ON public.user_achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
