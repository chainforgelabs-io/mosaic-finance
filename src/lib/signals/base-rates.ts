import { createServiceClient } from "@/lib/supabase/service";
import { SCORING_CONFIG_VERSION } from "./versions";

/**
 * Nightly base-rate materialization: aggregates labeled snapshots into
 * per-feature-bucket pop rates / mean forward returns / EV after costs,
 * side by side with the control cohort, and stores one reproducible JSON
 * payload per as-of date in base_rate_reports.
 */

/** Assumed flat round-trip cost. Microcap spreads run far higher — see docs. */
export const ROUND_TRIP_COST = 0.003;

const PAGE = 1000;
/** Safety valve for the in-memory aggregation. */
const MAX_LABEL_ROWS = 250_000;

interface SnapshotRow {
  id: string;
  ticker: string;
  scanned_at: string;
  cohort: "flagged" | "control";
  composite_score: number | null;
  buzz_score: number | null;
  under_the_radar: boolean | null;
  big_mover: boolean | null;
  scoring_config_version: number;
}

interface LabelRowLite {
  snapshot_id: string;
  horizon_days: number;
  entry_date: string | null;
  forward_return: number | null;
  max_favorable_excursion: number | null;
  max_adverse_excursion: number | null;
  pop_label: boolean | null;
  dump_label: boolean | null;
  status: string;
}

interface Observation {
  snapshot: SnapshotRow;
  labels: Map<number, LabelRowLite>;
  entryDate: string;
}

interface HorizonAgg {
  n: number;
  sumForwardReturn: number;
  sumMFE: number;
  sumMAE: number;
  popCount: number | null;
  dumpCount: number | null;
}

type BucketAgg = Map<number, HorizonAgg>;

const THRESHOLD_LABELS: Record<number, string> = {
  3: "+5% within 3 trading days (mirror -5%)",
  5: "+10% within 5 trading days (mirror -10%)",
  10: "+20% within 10 trading days (mirror -20%)",
};

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const supabase = createServiceClient();
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data || []) as T[];
    all.push(...page);
    if (page.length < PAGE || all.length >= MAX_LABEL_ROWS) break;
  }
  return all;
}

/** Decile edges (9 interior cut points) from the observed distribution. */
export function decileEdges(values: number[]): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const edges: number[] = [];
  for (let d = 1; d <= 9; d++) {
    const idx = Math.min(
      sorted.length - 1,
      Math.floor((d / 10) * sorted.length),
    );
    edges.push(sorted[idx]);
  }
  return edges;
}

export function decileOf(value: number, edges: number[]): number {
  let d = 0;
  while (d < edges.length && value >= edges[d]) d++;
  return d; // 0..9
}

function emptyHorizonAgg(hasThreshold: boolean): HorizonAgg {
  return {
    n: 0,
    sumForwardReturn: 0,
    sumMFE: 0,
    sumMAE: 0,
    popCount: hasThreshold ? 0 : null,
    dumpCount: hasThreshold ? 0 : null,
  };
}

function accumulate(agg: BucketAgg, labels: Map<number, LabelRowLite>): void {
  for (const [horizon, label] of labels) {
    if (
      label.status !== "ok" ||
      label.forward_return === null ||
      label.max_favorable_excursion === null ||
      label.max_adverse_excursion === null
    ) {
      continue;
    }
    const entry =
      agg.get(horizon) ?? emptyHorizonAgg(label.pop_label !== null);
    entry.n++;
    entry.sumForwardReturn += label.forward_return;
    entry.sumMFE += label.max_favorable_excursion;
    entry.sumMAE += label.max_adverse_excursion;
    if (label.pop_label !== null && entry.popCount !== null) {
      if (label.pop_label) entry.popCount++;
    }
    if (label.dump_label !== null && entry.dumpCount !== null) {
      if (label.dump_label) entry.dumpCount++;
    }
    agg.set(horizon, entry);
  }
}

function serializeBucket(agg: BucketAgg): Record<string, unknown> | null {
  const horizons: Record<string, unknown> = {};
  let anyEvents = 0;
  for (const [horizon, a] of [...agg.entries()].sort((x, y) => x[0] - y[0])) {
    if (a.n === 0) continue;
    anyEvents = Math.max(anyEvents, a.n);
    horizons[String(horizon)] = {
      n: a.n,
      meanForwardReturn: a.sumForwardReturn / a.n,
      meanMaxFavorableExcursion: a.sumMFE / a.n,
      meanMaxAdverseExcursion: a.sumMAE / a.n,
      ...(a.popCount !== null
        ? {
            threshold: THRESHOLD_LABELS[horizon],
            popRate: a.popCount / a.n,
            dumpRate: (a.dumpCount ?? 0) / a.n,
            evAfterCosts: a.sumForwardReturn / a.n - ROUND_TRIP_COST,
          }
        : {}),
    };
  }
  if (anyEvents === 0) return null;
  return { eventCount: anyEvents, horizons };
}

export async function buildBaseRateReport(): Promise<Record<string, unknown>> {
  const snapshots = await fetchAll<SnapshotRow>(
    "signal_snapshots",
    "id, ticker, scanned_at, cohort, composite_score, buzz_score, under_the_radar, big_mover, scoring_config_version",
  );
  const labels = await fetchAll<LabelRowLite>(
    "snapshot_labels",
    "snapshot_id, horizon_days, entry_date, forward_return, max_favorable_excursion, max_adverse_excursion, pop_label, dump_label, status",
  );

  const labelsBySnapshot = new Map<string, Map<number, LabelRowLite>>();
  for (const label of labels) {
    const m = labelsBySnapshot.get(label.snapshot_id) ?? new Map();
    m.set(label.horizon_days, label);
    labelsBySnapshot.set(label.snapshot_id, m);
  }

  // Only current-era, labeled snapshots participate — eras must not pool.
  const observations: Observation[] = [];
  for (const snap of snapshots) {
    if (snap.scoring_config_version !== SCORING_CONFIG_VERSION) continue;
    const snapLabels = labelsBySnapshot.get(snap.id);
    if (!snapLabels) continue;
    const okLabel = [...snapLabels.values()].find(
      (l) => l.status === "ok" && l.entry_date,
    );
    if (!okLabel) continue;
    observations.push({
      snapshot: snap,
      labels: snapLabels,
      entryDate: okLabel.entry_date!,
    });
  }

  // Decile edges from the flagged cohort's full labeled history — recorded
  // in the payload so buckets are interpretable and stable across dates.
  const flagged = observations.filter((o) => o.snapshot.cohort === "flagged");
  const compositeEdges = decileEdges(
    flagged
      .map((o) => o.snapshot.composite_score)
      .filter((v): v is number => v !== null),
  );
  const buzzEdges = decileEdges(
    flagged
      .map((o) => o.snapshot.buzz_score)
      .filter((v): v is number => v !== null),
  );

  const granularities: Record<string, Record<string, unknown>> = {};
  for (const granularity of ["snapshot", "ticker_day"] as const) {
    let obs = observations;
    if (granularity === "ticker_day") {
      // First snapshot per (cohort, ticker, entry date): removes intraday
      // pseudo-replication of a single tradeable outcome.
      const seen = new Map<string, Observation>();
      for (const o of [...observations].sort((a, b) =>
        a.snapshot.scanned_at.localeCompare(b.snapshot.scanned_at),
      )) {
        const key = `${o.snapshot.cohort}|${o.snapshot.ticker}|${o.entryDate}`;
        if (!seen.has(key)) seen.set(key, o);
      }
      obs = [...seen.values()];
    }

    const buckets = new Map<string, BucketAgg>();
    const add = (key: string, o: Observation) => {
      const agg = buckets.get(key) ?? new Map();
      accumulate(agg, o.labels);
      buckets.set(key, agg);
    };

    for (const o of obs) {
      const s = o.snapshot;
      add(`${s.cohort}|all|all`, o);
      if (s.cohort !== "flagged") continue;

      const cd =
        s.composite_score !== null
          ? decileOf(s.composite_score, compositeEdges)
          : null;
      const bd =
        s.buzz_score !== null ? decileOf(s.buzz_score, buzzEdges) : null;
      const radar = s.under_the_radar ? "true" : "false";
      const mover = s.big_mover ? "true" : "false";

      if (cd !== null) add(`flagged|composite_decile|${cd}`, o);
      if (bd !== null) add(`flagged|buzz_decile|${bd}`, o);
      add(`flagged|under_the_radar|${radar}`, o);
      add(`flagged|big_mover|${mover}`, o);
      if (cd !== null && bd !== null)
        add(`flagged|composite_decile,buzz_decile|${cd},${bd}`, o);
      if (cd !== null) {
        add(`flagged|composite_decile,under_the_radar|${cd},${radar}`, o);
        add(`flagged|composite_decile,big_mover|${cd},${mover}`, o);
      }
      if (bd !== null) {
        add(`flagged|buzz_decile,under_the_radar|${bd},${radar}`, o);
        add(`flagged|buzz_decile,big_mover|${bd},${mover}`, o);
      }
      add(`flagged|under_the_radar,big_mover|${radar},${mover}`, o);
    }

    const serialized: Record<string, unknown>[] = [];
    for (const [key, agg] of buckets) {
      const [cohort, bucketType, bucketValue] = key.split("|");
      const body = serializeBucket(agg);
      if (!body) continue;
      serialized.push({ cohort, bucketType, bucketValue, ...body });
    }
    granularities[granularity] = {
      observationCount: obs.length,
      buckets: serialized,
    };
  }

  return {
    version: 1,
    asOfDate: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    scoringConfigVersion: SCORING_CONFIG_VERSION,
    roundTripCostAssumption: ROUND_TRIP_COST,
    thresholds: THRESHOLD_LABELS,
    decileEdges: { compositeScore: compositeEdges, buzzScore: buzzEdges },
    notes: [
      "popRate/dumpRate are excursion-touch rates (intraday high/low vs entry open) — optimistic upper bounds, not attainable fills.",
      "meanForwardReturn is close-to-horizon buy-and-hold from the entry open.",
      "evAfterCosts = meanForwardReturn - flat 0.3% round-trip cost; bucket by liquidity before trusting it on microcaps.",
      "Entry is the NEXT market open after the scan: base rates answer 'does it pop after the next open, given the signal fired earlier', not 'can the same-day spike be caught'.",
      "granularity=ticker_day keeps the first snapshot per ticker per entry date; granularity=snapshot counts every scan and pseudo-replicates intraday observations.",
    ],
    granularities,
  };
}

export async function materializeBaseRateReport(): Promise<void> {
  const payload = await buildBaseRateReport();
  const supabase = createServiceClient();
  const { error } = await supabase.from("base_rate_reports").upsert(
    {
      as_of_date: payload.asOfDate as string,
      payload,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "as_of_date" },
  );
  if (error) throw error;
}
