# Signal Research Export API

Machine-readable access to the signal engine's self-labeling historical
dataset: per-scan feature snapshots, forward-return labels, aggregated base
rates, and pipeline health. Written so an external client can be built
against this document alone.

- **Base URL:** the production deployment origin (e.g. `https://<app>.vercel.app`)
- **Auth:** `Authorization: Bearer <token>` on every request. Two independent
  tokens exist (`EXPORT_API_TOKEN`, `RESEARCH_EXPORT_TOKEN`) so consumers can
  be revoked separately. 401 on bad token, 503 if unconfigured.
- **All timestamps are UTC ISO-8601.** All dates are `YYYY-MM-DD`.
- Responses carry a top-level `version` (currently `1`). Breaking schema
  changes bump it.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/export/snapshots` | Append-only per-scan ticker snapshots |
| `GET /api/export/labels` | Forward-return labels per snapshot × horizon |
| `GET /api/export/base-rates` | Nightly aggregated base-rate report |
| `GET /api/export/health` | Scan/label pipeline continuity |
| `GET /api/export/signals` | (Legacy) current-state signals — not the research dataset |

### Pagination (snapshots, labels)

Keyset cursors, never offsets. Pass `limit` (default 500, max 1000); when a
page is full the response includes an opaque `nextCursor` — pass it back as
`?cursor=` to continue. `nextCursor: null` means end of data. Rows are
immutable and returned in a stable ascending order, so pagination never
skips or duplicates.

Incremental polling recipe for `/labels`: persist the max `labeled_at` you
have seen and poll with `?since=<that>`; `since` filters on `labeled_at`
(when the label was computed), not `entry_date`, so late-arriving labels
(delisting grace periods, backfills after outages) are never missed.

---

## GET /api/export/snapshots

Query: `since` (inclusive, on `scanned_at`), `until` (exclusive), `cohort`
(`flagged` | `control`), `cursor`, `limit`.

Response: `{ version, generatedAt, rows: [Snapshot], nextCursor }`.

### Snapshot row

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid | Primary key; labels reference it |
| `scan_run_id` | uuid\|null | Heartbeat row of the producing scan |
| `scanned_at` | timestamp | Scan time (UTC) |
| `ticker` | string | Symbol, dot notation for share classes (`BRK.B`) |
| `cohort` | string | `flagged` (engine surfaced it) or `control` (random S&P 500 sample) |
| `composite_score` | number\|null | Weighted 0–100 composite |
| `momentum_score` … `persona_score` | number\|null | All seven sub-scores 0–100: `momentum`, `buzz`, `sentiment`, `congress`, `price_action`, `news`, `persona` |
| `big_mover` | bool\|null | \|day change\| > 5% or volume ratio > 3 |
| `under_the_radar` | bool\|null | composite > 60 and firehose mentions < 10 |
| `mention_count_24h` / `mention_count_7d` | int\|null | All-source, volume-weighted |
| `firehose_mentions_24h` | int\|null | Broad-X approximate mention volume |
| `tracked_weight_sum_24h` | number\|null | Quality-weighted tracked-account sum, fan-out dampened (the momentum input) |
| `avg_sentiment_24h` | number\|null | Mean LLM sentiment in [-1, 1] |
| `congress_buys_30d` / `congress_sells_30d` | int\|null | Net activity = buys − sells |
| `price_at_scan` | number\|null | Last trade at scan time |
| `day_change_pct` | number\|null | Same-day change % at scan time |
| `volume_ratio` | number\|null | Same-day volume / trailing avg volume; null when unknown (never fabricated 0) |
| `price_source` | string\|null | `finnhub` \| `fmp` \| `alpha_vantage` |
| `price_fetched_at` | timestamp\|null | Provider fetch time (see price-delay note) |
| `avg_dollar_volume` | number\|null | Trailing avg volume × price at scan (computed, not provider-native) |
| `market_cap` | number\|null | USD, at scan time |
| `exchange` | string\|null | Listing venue (`NASDAQ`, `NYSE`, `AMEX`, OTC variants…) — slice OTC separately; it behaves like a different asset class |
| `llm_model_version` | string | xAI model used for extraction in this era |
| `llm_prompt_version` | string | Ingest-prompt version in this era |
| `scoring_config_version` | int | Scoring weights/thresholds era |

**Null-vs-zero convention:** `control` rows have null score/mention fields —
the ticker may have had mentions that simply weren't aggregated; zero would
be a false claim. Only price/liquidity fields are populated for controls.

**Do not pool eras.** Filter or group by `scoring_config_version`,
`llm_model_version`, and `llm_prompt_version`. Scores are recomputable from
`raw_signals`, but the versions are recorded so you don't have to.

**Price source and delay:** scan-time prices pass through a 120-second
server-side cache on top of the provider's own latency (Finnhub near
real-time; FMP can be delayed), so `price_at_scan` can lag `scanned_at` by
roughly 2 minutes plus provider delay. `price_fetched_at` records the fetch
time. Snapshot prices are as-traded (unadjusted); all label math is done on
adjusted series (below), so this does not affect labels.

**Snapshot cadence:** intraday scans run every 30 minutes 13:00–21:00 UTC on
weekdays (hourly in light mode) plus one nightly scan at 07:00 UTC, covering
the top ~50 tickers by signal activity per scan. Consecutive intraday
snapshots of the same ticker are highly autocorrelated — see the base-rate
report's `granularity` note.

---

## GET /api/export/labels

Query: `since` (inclusive, on `labeled_at`), `cursor`, `limit`.

Response: `{ version, generatedAt, rows: [Label], nextCursor }`.

### Label row

One row per (snapshot, horizon). Horizons: 1, 3, 5, 10, 20 trading days.
A row is only written after its window has fully closed — the no-look-ahead
guarantee is structural, not procedural.

| Field | Type | Meaning |
|---|---|---|
| `snapshot_id` | uuid | FK to snapshot `id` |
| `horizon_days` | int | Trading days in the window; day 1 = entry day |
| `entry_date` | date\|null | First trading day whose 09:30 America/New_York open strictly follows the scan |
| `entry_open` | number\|null | Adjusted open on `entry_date` — the entry price |
| `forward_return` | number\|null | `close(day N) / entry_open − 1` |
| `max_favorable_excursion` | number\|null | `max(high, days 1..N) / entry_open − 1` |
| `max_adverse_excursion` | number\|null | `min(low, days 1..N) / entry_open − 1` |
| `pop_label` | bool\|null | Pre-registered: MFE ≥ +5% @ 3d, +10% @ 5d, +20% @ 10d; null on horizons 1 and 20 |
| `dump_label` | bool\|null | Mirror image on MAE (−5% @ 3d, −10% @ 5d, −20% @ 10d) |
| `status` | string | `ok`, or `insufficient_data` (see below) |
| `price_source` | string\|null | `yahoo_adjusted` \| `fmp_eod_adjusted` |
| `labeled_at` | timestamp | When the label was computed |

### What the entry rule measures

Entry is the **next market open after the scan**. Intraday scans therefore
deliberately exclude the same-day move: base rates answer *"does it pop
AFTER the next open, given the signal fired earlier that day/night"* — what
an end-of-day operator could actually trade — **not** "can the spike be
caught as it happens." Pre-market scans (the 07:00 UTC nightly) enter at
that same day's open. The 09:30 ET boundary is evaluated DST-correctly.

### Pop/dump labels are excursion-touch upper bounds

`pop_label`/`dump_label` fire when the intraday **high/low** touches the
threshold. The high of day is not a reliably attainable fill, so
excursion-touch hit rates are **optimistic upper bounds** for a target-exit
trade. `forward_return` is close-to-horizon **buy-and-hold** from the entry
open. Use pop rates to ask "how often is a target reachable at all"; use
forward returns for unconditional EV; model conservative exits yourself
from the stored MFE/MAE.

### Price adjustment (corporate actions)

All label math runs on **fully split- AND dividend-adjusted OHLC**, so
forward returns are total returns and a split or ex-dividend date inside a
window is inert (unit-tested with synthetic splits and dividends).

Sources, in order:

1. **Yahoo Finance daily chart** (`yahoo_adjusted`): raw OHLC is
   split-adjusted; the parallel `adjclose` series adds dividend adjustment,
   applied to O/H/L/C as a per-day factor. Chosen primary because it covers
   the small caps the engine actually flags.
2. **FMP `historical-price-eod/dividend-adjusted`** (`fmp_eod_adjusted`):
   provider-adjusted OHLC directly. Fallback — on the current FMP plan many
   small-cap symbols are plan-gated. (For reference: FMP's plain
   `historical-price-eod/full` is split-adjusted but **not**
   dividend-adjusted; it is not used for labels.)

The trading calendar is derived from the price series itself (dates with
bars are trading days), so holidays and halts need no separate table.

### `insufficient_data`

Snapshots whose windows can never close keep a label row with
`status: 'insufficient_data'` and null metrics rather than being dropped —
dropping them would inject survivorship bias exactly where the tails are
(post-pump delistings). Written when a ticker has no price data 30 days
after the scan, or stopped trading (no bar for 7+ days) before a window
closed. The snapshot itself always remains.

---

## GET /api/export/base-rates

Query: `asOf=YYYY-MM-DD` (optional; default latest). Returns the nightly
materialized report — one immutable payload per as-of date, so results are
reproducible. 404 until the first report materializes.

Payload:

```jsonc
{
  "version": 1,
  "asOfDate": "2026-07-05",
  "generatedAt": "...",
  "scoringConfigVersion": 1,        // only current-era snapshots included
  "roundTripCostAssumption": 0.003,
  "thresholds": { "3": "+5% within 3 trading days (mirror -5%)", "...": "..." },
  "decileEdges": {                  // recorded so buckets are interpretable
    "compositeScore": [/* 9 interior cut points */],
    "buzzScore": [/* ... */]
  },
  "notes": [/* methodology caveats, machine-readable copies of this doc */],
  "granularities": {
    "snapshot":   { "observationCount": 0, "buckets": [/* Bucket */] },
    "ticker_day": { "observationCount": 0, "buckets": [/* Bucket */] }
  }
}
```

### Bucket

```jsonc
{
  "cohort": "flagged",                   // or "control"
  "bucketType": "composite_decile",      // see list below
  "bucketValue": "7",                    // decile 0-9, "true"/"false", or "a,b" for combos
  "eventCount": 123,
  "horizons": {
    "3": {
      "n": 123,
      "meanForwardReturn": 0.011,        // close-to-horizon buy-and-hold
      "meanMaxFavorableExcursion": 0.043,
      "meanMaxAdverseExcursion": -0.032,
      "threshold": "+5% within 3 trading days (mirror -5%)",
      "popRate": 0.31,                   // excursion-touch — optimistic upper bound
      "dumpRate": 0.22,
      "evAfterCosts": 0.008              // meanForwardReturn − 0.3% round trip
    },
    "1": { /* no threshold fields — no pre-registered label at 1d/20d */ }
  }
}
```

Bucket types: `all` (both cohorts — the control comparison lives here),
`composite_decile`, `buzz_decile`, `under_the_radar`, `big_mover`, and all
pairwise combos (`composite_decile,buzz_decile`,
`composite_decile,under_the_radar`, `composite_decile,big_mover`,
`buzz_decile,under_the_radar`, `buzz_decile,big_mover`,
`under_the_radar,big_mover`). Decile buckets exist only for the flagged
cohort (controls have null scores). Empty buckets are omitted.

Granularities:

- `ticker_day` — first snapshot per (cohort, ticker, entry date). **Use this
  for trading questions**: intraday snapshots of one ticker-day share one
  entry and one outcome; counting them all pseudo-replicates observations.
- `snapshot` — every scan counted; answers whether within-day score
  intensity matters, at the cost of that pseudo-replication.

Caveats baked into the numbers:

- **EV after costs assumes a flat 0.3% round trip.** Real spreads on the
  microcaps that go viral run 1–2%+. Re-bucket by `avg_dollar_volume` /
  `market_cap` / `exchange` from the snapshots before trusting EV there.
- **Pop rates are excursion-touch upper bounds** (see labels section).
- **Control-group survivorship:** controls are sampled from a static current
  S&P 500 list (`src/lib/signals/sp500-universe.ts`, captured 2026-07-04,
  version-controlled). Current constituents are winners by construction, so
  the control baseline is mildly flattered. A top-1500-by-dollar-volume
  universe is the planned upgrade if this ever matters.

---

## GET /api/export/health

For uptime monitors and consumers verifying dataset continuity (a week of
missed scans poisons the baselines — alert on staleness).

```jsonc
{
  "version": 1,
  "generatedAt": "...",
  "lastScanByTrigger": {
    "cron_intraday": { "startedAt": "...", "finishedAt": "...", "status": "ok", "snapshotsWritten": 50 },
    "cron_nightly":  { /* ... */ },
    "manual":        { /* ... */ }
  },
  "lastIngestBySource": { "x_tracked": "...", "x_firehose": "...", "news": "...", "congress": "..." },
  "snapshotsLast24h": 850,
  "labeler": { "lastStartedAt": "...", "lastFinishedAt": "...", "lastStatus": "ok" },
  "unlabeledSnapshotBacklog": 1200    // snapshots missing ≥1 horizon (includes normal open windows)
}
```

Every scheduled scan writes a heartbeat row even when light mode
deliberately skips a tick (`status: skipped_light_mode`) or zero signals are
found, so gaps mean the cron did not fire. The nightly labeler additionally
reconstructs the previous day's expected schedule and raises a Sentry
warning for any missing slot.

Suggested alert rules: `lastScanByTrigger.cron_intraday.startedAt` older
than 2 hours during 13:00–21:00 UTC weekdays; `labeler.lastFinishedAt`
older than 26 hours; `snapshotsLast24h == 0` on a weekday.

---

## Versioning & era discipline

- `scoring_config_version` bumps on any change to scoring weights or flag
  thresholds; `llm_prompt_version` on any ingest-prompt change;
  `llm_model_version` records the extraction model.
- **Model-pin caveat:** xAI publishes dated immutable snapshots for some
  model lines, but the search-enabled flagship (`grok-4.3`, required for
  X search) currently has none, so `llm_model_version` is a stable alias
  with residual drift risk. First seen 2026-07-04. If alias behavior is
  observed to change, `llm_prompt_version` is bumped to fence the eras.
  Historical note: before 2026-07-04 the code requested
  `grok-3-fast-latest`, which xAI retired 2026-05-15 and silently
  redirected to `grok-4.3`; no snapshots exist from that era.
- Nothing LLM-derived is ever retro-filled or backdated; snapshot history
  begins at collection start and is append-only (enforced by a database
  trigger, not just convention).
