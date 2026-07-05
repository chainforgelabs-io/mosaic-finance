import { createServiceClient } from "@/lib/supabase/service";
import { getQuotes } from "@/lib/market-data/market-aggregator";
import { SP500_SYMBOLS } from "./sp500-universe";
import {
  EXTRACTION_MODEL,
  EXTRACTION_PROMPT_VERSION,
  SCORING_CONFIG_VERSION,
} from "./versions";

/**
 * Control cohort: once per scan day, snapshot ~30 random liquid tickers the
 * engine did NOT flag, and let the labeler treat them identically. Base
 * rates mean nothing without this unconditional comparison.
 *
 * Score/mention fields stay NULL — a control ticker may well have had
 * mentions that simply weren't aggregated; zero would be a false claim.
 */

const CONTROL_SAMPLE_SIZE = 30;

export async function snapshotControlGroup(
  scanRunId: string | null,
): Promise<{ controlsSnapshotted: number; errors: string[] }> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  // Once per UTC day
  const { count } = await supabase
    .from("signal_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("cohort", "control")
    .gte("scanned_at", dayStart.toISOString());
  if ((count ?? 0) > 0) {
    return { controlsSnapshotted: 0, errors };
  }

  // Exclude anything flagged today — controls must be un-flagged names
  const { data: flaggedToday } = await supabase
    .from("signal_snapshots")
    .select("ticker")
    .eq("cohort", "flagged")
    .gte("scanned_at", dayStart.toISOString());
  const excluded = new Set((flaggedToday || []).map((r) => r.ticker));

  const candidates = SP500_SYMBOLS.filter((s) => !excluded.has(s));
  const sample: string[] = [];
  const pool = [...candidates];
  while (sample.length < CONTROL_SAMPLE_SIZE && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    sample.push(pool.splice(idx, 1)[0]);
  }

  let quotes;
  try {
    quotes = await getQuotes(sample);
  } catch (err) {
    errors.push(
      `control quotes: ${err instanceof Error ? err.message : "unknown"}`,
    );
    return { controlsSnapshotted: 0, errors };
  }

  const scannedAt = new Date().toISOString();
  const rows = quotes
    .filter((q) => q.price > 0)
    .map((q) => ({
      scan_run_id: scanRunId,
      scanned_at: scannedAt,
      ticker: q.symbol,
      cohort: "control",
      price_at_scan: q.price,
      day_change_pct: q.changePercent,
      price_source: q.source,
      price_fetched_at: q.fetchedAt,
      llm_model_version: EXTRACTION_MODEL,
      llm_prompt_version: EXTRACTION_PROMPT_VERSION,
      scoring_config_version: SCORING_CONFIG_VERSION,
    }));

  if (rows.length === 0) {
    errors.push("control: no usable quotes");
    return { controlsSnapshotted: 0, errors };
  }

  const { error } = await supabase.from("signal_snapshots").insert(rows);
  if (error) {
    errors.push(`control insert: ${error.message}`);
    return { controlsSnapshotted: 0, errors };
  }
  return { controlsSnapshotted: rows.length, errors };
}
