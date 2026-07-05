import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { captureAPIError } from "@/lib/sentry";
import { authorizeExport } from "@/lib/export-auth";

/**
 * GET /api/export/health — dataset-continuity monitoring for external
 * consumers and uptime monitors. Reports last successful scan per trigger,
 * last ingest per raw-signal source, labeler recency, and backlog size.
 * Schema: docs/export-api.md.
 */

const SOURCES = ["x_tracked", "x_firehose", "news", "congress"] as const;

export async function GET(request: NextRequest) {
  const denied = authorizeExport(request);
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();

    const [
      lastRunsRes,
      lastLabelerRes,
      snapshots24hRes,
      unlabeledRes,
      ...sourceRes
    ] = await Promise.all([
      supabase
        .from("scan_runs")
        .select("trigger, started_at, finished_at, status, snapshots_written")
        .in("status", ["ok", "skipped_light_mode"])
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("job_runs")
        .select("started_at, finished_at, status, detail")
        .eq("job", "labeler")
        .order("started_at", { ascending: false })
        .limit(1),
      supabase
        .from("signal_snapshots")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", dayAgo),
      supabase.rpc("unlabeled_snapshots", { batch_size: 10000 }),
      ...SOURCES.map((source) =>
        supabase
          .from("raw_signals")
          .select("ingested_at")
          .eq("source", source)
          .order("ingested_at", { ascending: false })
          .limit(1),
      ),
    ]);

    const lastScanByTrigger: Record<string, unknown> = {};
    for (const run of lastRunsRes.data || []) {
      if (!lastScanByTrigger[run.trigger]) {
        lastScanByTrigger[run.trigger] = {
          startedAt: run.started_at,
          finishedAt: run.finished_at,
          status: run.status,
          snapshotsWritten: run.snapshots_written,
        };
      }
    }

    const lastIngestBySource: Record<string, string | null> = {};
    SOURCES.forEach((source, i) => {
      lastIngestBySource[source] =
        sourceRes[i]?.data?.[0]?.ingested_at ?? null;
    });

    const labeler = lastLabelerRes.data?.[0] ?? null;

    return NextResponse.json({
      version: 1,
      generatedAt: new Date().toISOString(),
      lastScanByTrigger,
      lastIngestBySource,
      snapshotsLast24h: snapshots24hRes.count ?? 0,
      labeler: labeler
        ? {
            lastStartedAt: labeler.started_at,
            lastFinishedAt: labeler.finished_at,
            lastStatus: labeler.status,
          }
        : null,
      unlabeledSnapshotBacklog: Array.isArray(unlabeledRes.data)
        ? unlabeledRes.data.length
        : null,
    });
  } catch (error) {
    captureAPIError(error, { route: "export/health" });
    return NextResponse.json({ error: "Health check failed." }, { status: 500 });
  }
}
