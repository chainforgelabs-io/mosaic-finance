import { NextRequest, NextResponse } from "next/server";
import { captureAPIError } from "@/lib/sentry";
import { createServiceClient } from "@/lib/supabase/service";
import { runLabeler } from "@/lib/signals/labeler";
import { materializeBaseRateReport } from "@/lib/signals/base-rates";
import { detectMissedScans } from "@/lib/signals/gap-detection";

export const maxDuration = 300;

/**
 * Nightly research job (Vercel Cron): label closed forward-return windows,
 * check yesterday's scan continuity, and materialize the base-rate report.
 * Each stage is independent — a failure in one never blocks the others.
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: jobRow } = await supabase
    .from("job_runs")
    .insert({ job: "labeler" })
    .select("id")
    .single();

  const detail: Record<string, unknown> = {};
  const stageErrors: string[] = [];

  try {
    detail.labeler = await runLabeler();
    stageErrors.push(...(detail.labeler as { errors: string[] }).errors);
  } catch (error) {
    captureAPIError(error, { route: "cron/picks-label", stage: "labeler" });
    stageErrors.push(
      `labeler: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  try {
    detail.gapCheck = await detectMissedScans();
  } catch (error) {
    captureAPIError(error, { route: "cron/picks-label", stage: "gaps" });
    stageErrors.push(
      `gaps: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  try {
    await materializeBaseRateReport();
    detail.baseRates = "ok";
  } catch (error) {
    captureAPIError(error, { route: "cron/picks-label", stage: "baseRates" });
    stageErrors.push(
      `baseRates: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  if (jobRow?.id) {
    await supabase
      .from("job_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: stageErrors.length > 0 ? "error" : "ok",
        detail: { ...detail, errors: stageErrors },
      })
      .eq("id", jobRow.id);
  }

  return NextResponse.json({ detail, errors: stageErrors });
}
