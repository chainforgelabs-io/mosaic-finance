-- Signal research dataset (Phase 1): scan heartbeats + append-only per-scan
-- ticker snapshots. Snapshots are the irreplaceable historical record that
-- forward-return labels are computed against — never updated, never deleted.

-- One row per scan attempt, including light-mode skips (so missed-cron
-- detection can distinguish "deliberately skipped" from "never fired").
create table if not exists public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  scheduled_for timestamptz,          -- nearest cron slot; null for manual runs
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null
    check (trigger in ('cron_intraday', 'cron_nightly', 'manual')),
  mode text check (mode in ('light', 'heavy')),
  status text not null default 'running'
    check (status in ('running', 'ok', 'error', 'skipped_light_mode')),
  tracked_ingested integer,
  firehose_ingested integer,
  news_ingested integer,
  tickers_aggregated integer,
  snapshots_written integer,
  errors jsonb not null default '[]'::jsonb,
  scoring_config_version integer not null
);

create index if not exists idx_scan_runs_started
  on public.scan_runs (started_at desc);

-- Full per-ticker feature snapshot at scan time. Append-only.
-- cohort 'flagged' = ticker surfaced by the engine; 'control' = random
-- liquid ticker sampled for unconditional base rates (score/mention fields
-- are NULL for controls — unknown, not zero).
create table if not exists public.signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid references public.scan_runs (id),
  scanned_at timestamptz not null,
  ticker text not null,
  cohort text not null default 'flagged'
    check (cohort in ('flagged', 'control')),

  -- Composite + all seven sub-scores (0-100)
  composite_score numeric,
  momentum_score numeric,
  buzz_score numeric,
  sentiment_score numeric,
  congress_score numeric,
  price_action_score numeric,
  news_score numeric,
  persona_score numeric,
  big_mover boolean,
  under_the_radar boolean,

  -- Feature inputs
  mention_count_24h integer,
  mention_count_7d integer,
  firehose_mentions_24h integer,
  tracked_weight_sum_24h numeric,     -- fan-out dampened, feeds momentum_score
  avg_sentiment_24h numeric,
  congress_buys_30d integer,
  congress_sells_30d integer,

  -- Market state at scan time
  price_at_scan numeric,
  day_change_pct numeric,
  volume_ratio numeric,               -- null when live volume unknown (never fabricated 0)
  price_source text,                  -- 'finnhub' | 'fmp' | 'alpha_vantage'
  price_fetched_at timestamptz,       -- provider fetch time; scanned_at - this = staleness

  -- Liquidity context (impossible to backfill honestly later)
  avg_dollar_volume numeric,          -- profile avgVolume * price_at_scan
  market_cap numeric,
  exchange text,

  -- Era separators: rows from different versions must not be pooled
  llm_model_version text not null,
  llm_prompt_version text not null,
  scoring_config_version integer not null
);

create index if not exists idx_signal_snapshots_scanned
  on public.signal_snapshots (scanned_at);

create index if not exists idx_signal_snapshots_ticker_scanned
  on public.signal_snapshots (ticker, scanned_at);

create index if not exists idx_signal_snapshots_cohort
  on public.signal_snapshots (cohort, scanned_at);

-- Enforce append-only at the database level. The service-role client
-- bypasses RLS but not triggers.
create or replace function public.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists signal_snapshots_immutable on public.signal_snapshots;
create trigger signal_snapshots_immutable
  before update or delete on public.signal_snapshots
  for each row execute function public.reject_mutation();

-- Extraction provenance on the raw events themselves (the LLM runs at
-- ingest time, not scan time). Null for non-LLM sources (news, congress).
alter table public.raw_signals
  add column if not exists model text,
  add column if not exists prompt_version text;

-- RLS: no policies — only the service-role client (cron jobs, export API)
-- touches these tables.
alter table public.scan_runs enable row level security;
alter table public.signal_snapshots enable row level security;
