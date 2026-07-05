import { createServiceClient } from "@/lib/supabase/service";
import { getAdjustedHistory } from "@/lib/market-data/adjusted-history";
import {
  LABEL_HORIZONS,
  adjustBars,
  computeHorizonLabels,
  entryDateFor,
} from "./label-math";

/**
 * Nightly forward-return labeler. Oldest snapshots first, idempotent
 * (insert with onConflict ignore), and structurally look-ahead-free: a
 * horizon row is only written once bars exist for the full window.
 */

const BATCH_SIZE = 2000;
/** Ticker with no bar in this many days = stopped trading (delisted/halted). */
const STALE_TICKER_DAYS = 7;
/** Snapshot with no price history at all after this long = unlabelable. */
const NO_HISTORY_GRACE_DAYS = 30;

interface UnlabeledSnapshot {
  id: string;
  ticker: string;
  scanned_at: string;
  labeled_horizons: number[];
}

interface LabelRow {
  snapshot_id: string;
  horizon_days: number;
  entry_date: string | null;
  entry_open: number | null;
  forward_return: number | null;
  max_favorable_excursion: number | null;
  max_adverse_excursion: number | null;
  pop_label: boolean | null;
  dump_label: boolean | null;
  status: "ok" | "insufficient_data";
  price_source: string | null;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400_000);
}

export async function runLabeler(): Promise<{
  snapshotsExamined: number;
  labelsWritten: number;
  insufficientWritten: number;
  tickersProcessed: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  const { data, error } = await supabase.rpc("unlabeled_snapshots", {
    batch_size: BATCH_SIZE,
  });
  if (error) throw error;
  const pending = (data || []) as UnlabeledSnapshot[];
  if (pending.length === 0) {
    return {
      snapshotsExamined: 0,
      labelsWritten: 0,
      insufficientWritten: 0,
      tickersProcessed: 0,
      errors,
    };
  }

  const byTicker = new Map<string, UnlabeledSnapshot[]>();
  for (const snap of pending) {
    const list = byTicker.get(snap.ticker) ?? [];
    list.push(snap);
    byTicker.set(snap.ticker, list);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const staleCutoff = daysAgo(STALE_TICKER_DAYS).toISOString().slice(0, 10);
  const rows: LabelRow[] = [];
  let labelsWritten = 0;
  let insufficientWritten = 0;

  for (const [ticker, snaps] of byTicker) {
    const oldestScan = snaps
      .map((s) => s.scanned_at)
      .sort()[0]
      .slice(0, 10);
    // A few days of slack before the oldest scan so the entry-date search
    // never starts past the first bar.
    const fromIso = new Date(
      new Date(`${oldestScan}T00:00:00Z`).getTime() - 5 * 86400_000,
    )
      .toISOString()
      .slice(0, 10);

    let history;
    try {
      history = await getAdjustedHistory(ticker, fromIso, todayIso);
    } catch (err) {
      errors.push(
        `${ticker}: ${err instanceof Error ? err.message : "unknown"}`,
      );
      continue;
    }

    if (!history || history.bars.length === 0) {
      // No price data from either source. After the grace period, mark the
      // snapshot unlabelable — never drop it (survivorship bias).
      for (const snap of snaps) {
        if (new Date(snap.scanned_at) > daysAgo(NO_HISTORY_GRACE_DAYS)) {
          continue;
        }
        for (const horizon of LABEL_HORIZONS) {
          if (snap.labeled_horizons.includes(horizon)) continue;
          rows.push(insufficientRow(snap.id, horizon));
          insufficientWritten++;
        }
      }
      continue;
    }

    const bars = adjustBars(history.bars);
    const tradingDates = bars.map((b) => b.date);
    const tickerStale = tradingDates[tradingDates.length - 1] < staleCutoff;

    for (const snap of snaps) {
      const entryDate = entryDateFor(new Date(snap.scanned_at), tradingDates);

      if (!entryDate) {
        // No bar after the scan yet. Normal for recent snapshots; terminal
        // if the ticker stopped trading before the next open.
        if (tickerStale) {
          for (const horizon of LABEL_HORIZONS) {
            if (snap.labeled_horizons.includes(horizon)) continue;
            rows.push(insufficientRow(snap.id, horizon));
            insufficientWritten++;
          }
        }
        continue;
      }

      const labels = computeHorizonLabels(entryDate, bars);
      const closedHorizons = new Set(labels.map((l) => l.horizonDays));

      for (const label of labels) {
        if (snap.labeled_horizons.includes(label.horizonDays)) continue;
        rows.push({
          snapshot_id: snap.id,
          horizon_days: label.horizonDays,
          entry_date: label.entryDate,
          entry_open: label.entryOpen,
          forward_return: label.forwardReturn,
          max_favorable_excursion: label.maxFavorableExcursion,
          max_adverse_excursion: label.maxAdverseExcursion,
          pop_label: label.popLabel,
          dump_label: label.dumpLabel,
          status: "ok",
          price_source: history.source,
        });
        labelsWritten++;
      }

      // Ticker stopped trading mid-window: unclosed horizons never close.
      if (tickerStale) {
        for (const horizon of LABEL_HORIZONS) {
          if (
            closedHorizons.has(horizon) ||
            snap.labeled_horizons.includes(horizon)
          ) {
            continue;
          }
          rows.push(insufficientRow(snap.id, horizon));
          insufficientWritten++;
        }
      }
    }
  }

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error: insertErr } = await supabase
      .from("snapshot_labels")
      .upsert(rows.slice(i, i + CHUNK), {
        onConflict: "snapshot_id,horizon_days",
        ignoreDuplicates: true,
      });
    if (insertErr) {
      errors.push(`insert: ${insertErr.message}`);
      break;
    }
  }

  return {
    snapshotsExamined: pending.length,
    labelsWritten,
    insufficientWritten,
    tickersProcessed: byTicker.size,
    errors,
  };
}

function insufficientRow(snapshotId: string, horizon: number): LabelRow {
  return {
    snapshot_id: snapshotId,
    horizon_days: horizon,
    entry_date: null,
    entry_open: null,
    forward_return: null,
    max_favorable_excursion: null,
    max_adverse_excursion: null,
    pop_label: null,
    dump_label: null,
    status: "insufficient_data",
    price_source: null,
  };
}
