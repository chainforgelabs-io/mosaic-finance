-- Signal research dataset (Phase 2): forward-return labels, labeler job
-- heartbeats, base-rate report store.

-- One row per (snapshot, horizon). Rows are only written after the window
-- has fully closed (structural no-look-ahead) and are derived data —
-- recomputable from signal_snapshots + price history, so no immutability
-- trigger (unlike signal_snapshots).
create table if not exists public.snapshot_labels (
  snapshot_id uuid not null references public.signal_snapshots (id),
  horizon_days integer not null check (horizon_days in (1, 3, 5, 10, 20)),
  entry_date date,                    -- first trading day whose open follows the scan
  entry_open numeric,                 -- split+dividend adjusted
  forward_return numeric,             -- close(day N) / open(day 1) - 1; day 1 = entry day
  max_favorable_excursion numeric,    -- max(high, days 1..N) / entry_open - 1
  max_adverse_excursion numeric,      -- min(low, days 1..N) / entry_open - 1
  pop_label boolean,                  -- pre-registered: MFE >= +5%@3d, +10%@5d, +20%@10d
  dump_label boolean,                 -- mirror: MAE <= -5%@3d, -10%@5d, -20%@10d
  status text not null default 'ok'
    check (status in ('ok', 'insufficient_data')),
  price_source text,                  -- 'yahoo_adjusted' | 'fmp_eod_adjusted'
  labeled_at timestamptz not null default now(),
  primary key (snapshot_id, horizon_days)
);

create index if not exists idx_snapshot_labels_labeled_at
  on public.snapshot_labels (labeled_at);

-- Labeler work queue: snapshots that don't yet have all five horizon rows,
-- oldest first. Efficient anti-join the JS client can't express.
create or replace function public.unlabeled_snapshots(batch_size integer default 2000)
returns table (
  id uuid,
  ticker text,
  scanned_at timestamptz,
  labeled_horizons integer[]
)
language sql
stable
as $$
  select s.id, s.ticker, s.scanned_at,
         coalesce(array_agg(l.horizon_days) filter (where l.horizon_days is not null), '{}')
  from public.signal_snapshots s
  left join public.snapshot_labels l on l.snapshot_id = s.id
  group by s.id, s.ticker, s.scanned_at
  having count(l.snapshot_id) < 5
  order by s.scanned_at asc
  limit batch_size;
$$;

-- Heartbeats for non-scan jobs (labeler, base-rate materialization).
create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'ok', 'error')),
  detail jsonb not null default '{}'::jsonb
);

create index if not exists idx_job_runs_job_started
  on public.job_runs (job, started_at desc);

-- Nightly-materialized base-rate report: one JSON payload per as-of date,
-- so any report is reproducible and the endpoint is a trivial read.
create table if not exists public.base_rate_reports (
  as_of_date date primary key,
  payload jsonb not null,
  generated_at timestamptz not null default now()
);

alter table public.snapshot_labels enable row level security;
alter table public.job_runs enable row level security;
alter table public.base_rate_reports enable row level security;
