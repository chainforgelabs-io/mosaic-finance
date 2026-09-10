-- AI usage metering, health score history, category budgets, waitlist nurture

CREATE TABLE public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('message', 'report', 'upload', 'commentary')),
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_usage_events_user_created_idx
  ON public.ai_usage_events (user_id, created_at DESC);

CREATE INDEX ai_usage_events_user_kind_created_idx
  ON public.ai_usage_events (user_id, kind, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai usage"
  ON public.ai_usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE TABLE public.health_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('derived', 'report')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX health_score_history_user_recorded_idx
  ON public.health_score_history (user_id, recorded_at DESC);

ALTER TABLE public.health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own health scores"
  ON public.health_score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own health scores"
  ON public.health_score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
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
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit >= 0),
  effective_from DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category)
);

CREATE INDEX category_budgets_user_idx
  ON public.category_budgets (user_id);

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets"
  ON public.category_budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_category_budgets_updated_at
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS nurture_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_nurture_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN NOT NULL DEFAULT true;
