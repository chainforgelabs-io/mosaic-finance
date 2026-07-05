import { createServiceClient } from "@/lib/supabase/service";
import { ingestTrackedAccounts } from "./ingest-tracked";
import { ingestFirehose } from "./ingest-firehose";
import { ingestNews } from "./ingest-news";
import { ingestCongressTrades } from "./ingest-congress";
import { aggregateSignals } from "./aggregate";
import { startScanRun, finishScanRun, type ScanTrigger } from "./scan-runs";
import type { PicksMode, ScanSummary } from "@/types/picks";

/**
 * Single-operator tool: mode comes from whichever picks_settings row is
 * heaviest (in practice there is one user).
 */
export async function getCurrentMode(): Promise<PicksMode> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("picks_settings").select("mode");
    return (data || []).some((r) => r.mode === "heavy") ? "heavy" : "light";
  } catch {
    return "light";
  }
}

/** True when no congress trades have ever been ingested (first-run state). */
export async function congressDataMissing(): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("raw_signals")
      .select("id", { count: "exact", head: true })
      .eq("source", "congress");
    return (count ?? 0) === 0;
  } catch {
    return false;
  }
}

/**
 * Full ingestion + aggregation pipeline. Firehose only runs in heavy mode
 * (or when forced) to keep light mode cheap on Grok quota. Congress trades
 * normally ingest via their own daily cron; pass includeCongress to backfill
 * on demand (e.g. very first scan).
 */
export async function runScan(options?: {
  mode?: PicksMode;
  includeFirehose?: boolean;
  includeCongress?: boolean;
  trigger?: ScanTrigger;
}): Promise<ScanSummary> {
  const startedAt = new Date().toISOString();
  const mode = options?.mode ?? (await getCurrentMode());
  const includeFirehose = options?.includeFirehose ?? mode === "heavy";
  const errors: string[] = [];

  const scanRunId = await startScanRun({
    trigger: options?.trigger ?? "manual",
    mode,
  });

  let trackedPostsIngested = 0;
  let firehosePostsIngested = 0;
  let newsSignalsIngested = 0;

  // News is cheap (already cached) — run alongside tracked ingestion
  const [trackedResult, newsResult] = await Promise.allSettled([
    ingestTrackedAccounts(),
    ingestNews(),
  ]);

  if (trackedResult.status === "fulfilled") {
    trackedPostsIngested = trackedResult.value.postsIngested;
    errors.push(...trackedResult.value.errors);
  } else {
    errors.push(`tracked: ${trackedResult.reason}`);
  }

  if (newsResult.status === "fulfilled") {
    newsSignalsIngested = newsResult.value.signalsIngested;
    errors.push(...newsResult.value.errors);
  } else {
    errors.push(`news: ${newsResult.reason}`);
  }

  if (includeFirehose) {
    try {
      const firehoseResult = await ingestFirehose();
      firehosePostsIngested = firehoseResult.postsIngested;
      errors.push(...firehoseResult.errors);
    } catch (err) {
      errors.push(
        `firehose: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  if (options?.includeCongress) {
    try {
      const congressResult = await ingestCongressTrades();
      errors.push(...congressResult.errors);
    } catch (err) {
      errors.push(
        `congress: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  let tickersAggregated = 0;
  let snapshotsWritten = 0;
  try {
    const aggResult = await aggregateSignals({
      scanRunId: scanRunId ?? undefined,
    });
    tickersAggregated = aggResult.tickersAggregated;
    snapshotsWritten = aggResult.snapshotsWritten;
    errors.push(...aggResult.errors);
  } catch (err) {
    errors.push(
      `aggregate: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  const summary: ScanSummary = {
    mode,
    trackedPostsIngested,
    firehosePostsIngested,
    newsSignalsIngested,
    tickersAggregated,
    snapshotsWritten,
    startedAt,
    finishedAt: new Date().toISOString(),
    errors,
  };

  await finishScanRun(scanRunId, summary);
  return summary;
}
