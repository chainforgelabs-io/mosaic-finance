import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { captureAPIError } from "@/lib/sentry";
import { authorizeExport } from "@/lib/export-auth";

/**
 * GET /api/export/base-rates — nightly-materialized base-rate report.
 * Latest by default; ?asOf=YYYY-MM-DD returns that date's exact payload
 * (reports are reproducible per as-of date). Schema: docs/export-api.md.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeExport(request);
  if (denied) return denied;

  try {
    const asOf = request.nextUrl.searchParams.get("asOf");
    const supabase = createServiceClient();

    let query = supabase
      .from("base_rate_reports")
      .select("payload")
      .order("as_of_date", { ascending: false })
      .limit(1);
    if (asOf) query = query.eq("as_of_date", asOf);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No base-rate report available yet." },
        { status: 404 },
      );
    }
    return NextResponse.json(data[0].payload);
  } catch (error) {
    captureAPIError(error, { route: "export/base-rates" });
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
