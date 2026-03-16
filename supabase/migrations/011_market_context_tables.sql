-- Market quotes cache for Redis fallback persistence
create table if not exists market_quotes_cache (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  quote_data jsonb not null,
  source text not null check (source in ('finnhub', 'fmp', 'alpha_vantage')),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_market_quotes_symbol on market_quotes_cache (symbol);
create index idx_market_quotes_expires on market_quotes_cache (expires_at);

-- News articles aggregated from multiple sources
create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  source text not null,
  source_url text,
  image_url text,
  category text not null default 'general'
    check (category in ('macro', 'equities', 'crypto', 'commodities', 'canadian', 'general')),
  related_tickers text[] default '{}',
  sentiment_score float,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now()
);

create index idx_news_articles_published on news_articles (published_at desc);
create index idx_news_articles_category on news_articles (category);

-- AI investor commentaries
create table if not exists ai_commentaries (
  id uuid primary key default gen_random_uuid(),
  persona text not null
    check (persona in ('ray_dalio', 'warren_buffett', 'cathie_wood', 'howard_marks', 'peter_lynch', 'canadian_perspective')),
  model_used text not null check (model_used in ('sonnet', 'opus')),
  market_data_snapshot jsonb,
  commentary jsonb not null,
  generated_at timestamptz not null default now(),
  period text not null default 'weekly' check (period in ('daily', 'weekly'))
);

create index idx_ai_commentaries_persona on ai_commentaries (persona, generated_at desc);

-- User watchlists
create table if not exists user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  added_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index idx_user_watchlists_user on user_watchlists (user_id);

-- Weekly newsletter editions
create table if not exists newsletter_editions (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  content jsonb not null,
  generated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index idx_newsletter_editions_period on newsletter_editions (period_end desc);

-- RLS policies
alter table market_quotes_cache enable row level security;
alter table news_articles enable row level security;
alter table ai_commentaries enable row level security;
alter table user_watchlists enable row level security;
alter table newsletter_editions enable row level security;

-- market_quotes_cache: read-only for authenticated users
create policy "Authenticated users can read market quotes"
  on market_quotes_cache for select
  to authenticated
  using (true);

-- news_articles: read-only for authenticated users
create policy "Authenticated users can read news"
  on news_articles for select
  to authenticated
  using (true);

-- ai_commentaries: read-only for authenticated users
create policy "Authenticated users can read commentaries"
  on ai_commentaries for select
  to authenticated
  using (true);

-- user_watchlists: users can only access their own
create policy "Users can read own watchlist"
  on user_watchlists for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
  on user_watchlists for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist"
  on user_watchlists for delete
  to authenticated
  using (auth.uid() = user_id);

-- newsletter_editions: read-only for authenticated users
create policy "Authenticated users can read newsletters"
  on newsletter_editions for select
  to authenticated
  using (true);
