import { createServiceClient } from "@/lib/supabase/service";
import { ingestTrackedAccounts } from "./ingest-tracked";
import { ingestFirehose } from "./ingest-firehose";
import { ingestNews } from "./ingest-news";
import { aggregateSignals } from "./aggregate";
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

/**
 * Full ingestion + aggregation pipeline. Firehose only runs in heavy mode
 * (or when forced) to keep light mode cheap on Grok quota.
 */
export async function runScan(options?: {
  mode?: PicksMode;
  includeFirehose?: boolean;
}): Promise<ScanSummary> {
  const startedAt = new Date().toISOString();
  const mode = options?.mode ?? (await getCurrentMode());
  const includeFirehose = options?.includeFirehose ?? mode === "heavy";
  const errors: string[] = [];

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

  let tickersAggregated = 0;
  try {
    const aggResult = await aggregateSignals();
    tickersAggregated = aggResult.tickersAggregated;
    errors.push(...aggResult.errors);
  } catch (err) {
    errors.push(
      `aggregate: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  return {
    mode,
    trackedPostsIngested,
    firehosePostsIngested,
    newsSignalsIngested,
    tickersAggregated,
    startedAt,
    finishedAt: new Date().toISOString(),
    errors,
  };
}
