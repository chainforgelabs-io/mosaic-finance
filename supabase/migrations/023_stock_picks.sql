-- Stock Picker (Phase 1): schema, RLS, seed tracked X accounts

-- Tracked X accounts (manual, OAuth-suggested, or seeded)
create table if not exists public.tracked_x_accounts (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  display_name text,
  category text not null default 'general',
  weight numeric not null default 0.7 check (weight >= 0 and weight <= 1),
  active boolean not null default true,
  source_added_via text not null default 'manual'
    check (source_added_via in ('manual', 'twitter_oauth', 'seed')),
  added_at timestamptz not null default now(),
  last_ingested_at timestamptz
);

create index if not exists idx_tracked_x_accounts_active
  on public.tracked_x_accounts (active)
  where active = true;

-- Congress members to follow (Phase 4)
create table if not exists public.tracked_congress_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  chamber text,
  party text,
  track_record_score numeric,
  source text,
  active boolean not null default true,
  added_at timestamptz not null default now()
);

-- Raw ingestion events (append-only)
create table if not exists public.raw_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('x_tracked', 'x_firehose', 'congress', 'news', 'price_action')),
  source_id text not null,
  ticker text not null,
  author_handle text,
  content text,
  url text,
  sentiment numeric,
  engagement integer,
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  -- One tweet/filing can mention multiple tickers: uniqueness includes ticker
  unique (source, source_id, ticker)
);

create index if not exists idx_raw_signals_ticker_occurred
  on public.raw_signals (ticker, occurred_at desc);

create index if not exists idx_raw_signals_source_occurred
  on public.raw_signals (source, occurred_at desc);

-- Aggregated per-ticker signals
create table if not exists public.ticker_signals (
  ticker text primary key,
  name text,
  sector text,
  last_price numeric,
  last_change_pct numeric,
  mention_count_24h integer default 0,
  mention_count_7d integer default 0,
  tracked_account_mentions_24h integer default 0,
  firehose_mentions_24h integer default 0,
  congress_buys_30d integer default 0,
  congress_sells_30d integer default 0,
  avg_sentiment_24h numeric,
  momentum_score numeric,
  value_score numeric,
  congress_score numeric,
  composite_score numeric,
  under_the_radar boolean default false,
  big_mover boolean default false,
  last_updated_at timestamptz not null default now()
);

create index if not exists idx_ticker_signals_composite
  on public.ticker_signals (composite_score desc nulls last);

create index if not exists idx_ticker_signals_updated
  on public.ticker_signals (last_updated_at desc);

-- Cached AI persona takes per ticker (Phase 5)
create table if not exists public.ticker_persona_takes (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  persona text not null,
  outlook text not null
    check (
      outlook in (
        'very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'
      )
    ),
  summary text not null,
  key_points jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (ticker, persona)
);

-- User favorited tickers
create table if not exists public.user_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  added_at timestamptz not null default now(),
  notes text,
  alert_on_change boolean not null default false,
  unique (user_id, ticker)
);

create index if not exists idx_user_picks_user
  on public.user_picks (user_id);

-- Per-user picks mode (light / heavy)
create table if not exists public.picks_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mode text not null default 'light' check (mode in ('light', 'heavy')),
  last_changed_at timestamptz not null default now()
);

-- X (Twitter) OAuth tokens for the "link your account" flow
create table if not exists public.x_oauth_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  x_user_id text not null,
  x_username text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz not null default now()
);

-- RLS
alter table public.tracked_x_accounts enable row level security;
alter table public.tracked_congress_members enable row level security;
alter table public.raw_signals enable row level security;
alter table public.ticker_signals enable row level security;
alter table public.ticker_persona_takes enable row level security;
alter table public.user_picks enable row level security;
alter table public.picks_settings enable row level security;
alter table public.x_oauth_tokens enable row level security;

-- Read-only global tables for authenticated users
create policy "Authenticated users can read tracked_x_accounts"
  on public.tracked_x_accounts for select
  to authenticated
  using (true);

create policy "Authenticated users can read tracked_congress_members"
  on public.tracked_congress_members for select
  to authenticated
  using (true);

create policy "Authenticated users can read raw_signals"
  on public.raw_signals for select
  to authenticated
  using (true);

create policy "Authenticated users can read ticker_signals"
  on public.ticker_signals for select
  to authenticated
  using (true);

create policy "Authenticated users can read ticker_persona_takes"
  on public.ticker_persona_takes for select
  to authenticated
  using (true);

-- user_picks: own rows only
create policy "Users can read own picks"
  on public.user_picks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own picks"
  on public.user_picks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own picks"
  on public.user_picks for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own picks"
  on public.user_picks for delete
  to authenticated
  using (auth.uid() = user_id);

-- picks_settings: own row only
create policy "Users can read own picks_settings"
  on public.picks_settings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own picks_settings"
  on public.picks_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own picks_settings"
  on public.picks_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- x_oauth_tokens: own row only (server-side writes via session client)
create policy "Users can read own x_oauth_tokens"
  on public.x_oauth_tokens for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own x_oauth_tokens"
  on public.x_oauth_tokens for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own x_oauth_tokens"
  on public.x_oauth_tokens for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own x_oauth_tokens"
  on public.x_oauth_tokens for delete
  to authenticated
  using (auth.uid() = user_id);

-- tracked_x_accounts: authenticated users can manage the tracked list
-- (single-operator tool; writes also flow through service-role in cron jobs)
create policy "Authenticated users can insert tracked_x_accounts"
  on public.tracked_x_accounts for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update tracked_x_accounts"
  on public.tracked_x_accounts for update
  to authenticated
  using (true);

create policy "Authenticated users can delete tracked_x_accounts"
  on public.tracked_x_accounts for delete
  to authenticated
  using (true);

create policy "Authenticated users can update tracked_congress_members"
  on public.tracked_congress_members for update
  to authenticated
  using (true);

-- Seed starter FinTwit accounts (mirror src/lib/signals/seed-accounts.ts)
insert into public.tracked_x_accounts (
  handle, display_name, category, weight, active, source_added_via
)
values
  ('unusual_whales', 'Unusual Whales', 'flow', 0.9, true, 'seed'),
  ('charliebilello', 'Charlie Bilello', 'macro', 0.85, true, 'seed'),
  ('TheTranscript_', 'The Transcript', 'earnings', 0.85, true, 'seed'),
  ('LizAnnSonders', 'Liz Ann Sonders', 'macro', 0.85, true, 'seed'),
  ('sentimenttrader', 'Sentiment Trader', 'technicals', 0.8, true, 'seed'),
  ('markminervini', 'Mark Minervini', 'technicals', 0.85, true, 'seed'),
  ('RaoulGMI', 'Raoul Pal', 'macro', 0.8, true, 'seed'),
  ('profplum99', 'Plum (@profplum99)', 'value', 0.75, true, 'seed'),
  ('hkuppy', 'Kuppy', 'macro', 0.8, true, 'seed'),
  ('Citrini7', 'Citrini', 'research', 0.75, true, 'seed'),
  ('MebFaber', 'Meb Faber', 'macro', 0.8, true, 'seed'),
  ('cliffordasness', 'Cliff Asness', 'quant', 0.8, true, 'seed'),
  ('AndrewLokenauth', 'Andrew Lokenauth', 'education', 0.7, true, 'seed'),
  ('PauloMacro', 'PauloMacro', 'macro', 0.75, true, 'seed'),
  ('scion_capital', 'Scion Asset (Michael Burry)', 'value', 0.85, true, 'seed'),
  ('zerohedge', 'ZeroHedge', 'news', 0.65, true, 'seed'),
  ('LynAldenContact', 'Lyn Alden', 'macro', 0.85, true, 'seed'),
  ('jposhaughnessy', 'Jim O''Shaughnessy', 'macro', 0.75, true, 'seed'),
  ('MorganHousel', 'Morgan Housel', 'behavior', 0.75, true, 'seed'),
  ('Hedgeye', 'Hedgeye', 'research', 0.7, true, 'seed')
on conflict (handle) do nothing;
