import { createServiceClient } from "@/lib/supabase/service";
import { SCORING_CONFIG_VERSION } from "./versions";
import type { PicksMode, ScanSummary } from "@/types/picks";

export type ScanTrigger = "cron_intraday" | "cron_nightly" | "manual";

/** Round to the nearest 30-min boundary — cron fires with small jitter. */
export function nearestCronSlot(now = new Date()): string {
  const ms = 30 * 60_000;
  return new Date(Math.round(now.getTime() / ms) * ms).toISOString();
}

/**
 * Heartbeat row for every scheduled scan attempt — including light-mode
 * skips, so missed-cron detection can tell "deliberately skipped" apart
 * from "cron never fired". Heartbeat failures never block the scan itself.
 */
export async function startScanRun(params: {
  trigger: ScanTrigger;
  mode?: PicksMode;
}): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("scan_runs")
      .insert({
        trigger: params.trigger,
        mode: params.mode ?? null,
        scheduled_for:
          params.trigger === "manual" ? null : nearestCronSlot(),
        status: "running",
        scoring_config_version: SCORING_CONFIG_VERSION,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  } catch (err) {
    console.error("scan_runs heartbeat insert failed:", err);
    return null;
  }
}

export async function finishScanRun(
  scanRunId: string | null,
  summary: ScanSummary,
): Promise<void> {
  if (!scanRunId) return;
  try {
    const supabase = createServiceClient();
    await supabase
      .from("scan_runs")
      .update({
        finished_at: summary.finishedAt,
        mode: summary.mode,
        status: summary.errors.length > 0 ? "error" : "ok",
        tracked_ingested: summary.trackedPostsIngested,
        firehose_ingested: summary.firehosePostsIngested,
        news_ingested: summary.newsSignalsIngested,
        tickers_aggregated: summary.tickersAggregated,
        snapshots_written: summary.snapshotsWritten,
        errors: summary.errors,
      })
      .eq("id", scanRunId);
  } catch (err) {
    console.error("scan_runs heartbeat update failed:", err);
  }
}

/** Record a cron tick that light mode deliberately skipped. */
export async function recordSkippedScan(mode: PicksMode): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("scan_runs").insert({
      trigger: "cron_intraday",
      mode,
      scheduled_for: nearestCronSlot(),
      finished_at: new Date().toISOString(),
      status: "skipped_light_mode",
      scoring_config_version: SCORING_CONFIG_VERSION,
    });
  } catch (err) {
    console.error("scan_runs skip heartbeat failed:", err);
  }
}
