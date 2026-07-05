import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { captureAPIError } from "@/lib/sentry";
import {
  authorizeExport,
  decodeCursor,
  encodeCursor,
} from "@/lib/export-auth";

/**
 * GET /api/export/snapshots — append-only research snapshots, keyset
 * paginated ascending by (scanned_at, id). Schema: docs/export-api.md.
 *
 *   ?since=<iso>   inclusive lower bound on scanned_at
 *   ?until=<iso>   exclusive upper bound on scanned_at
 *   ?cohort=flagged|control
 *   ?cursor=<opaque>  from previous page's nextCursor
 *   ?limit=<n>     default 500, max 1000
 */

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

export async function GET(request: NextRequest) {
  const denied = authorizeExport(request);
  if (denied) return denied;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(params.get("limit") || String(DEFAULT_LIMIT), 10) ||
        DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const since = params.get("since");
    const until = params.get("until");
    const cohort = params.get("cohort");
    const cursor = decodeCursor(params.get("cursor"), 2);

    const supabase = createServiceClient();
    let query = supabase
      .from("signal_snapshots")
      .select("*")
      .order("scanned_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (since) query = query.gte("scanned_at", since);
    if (until) query = query.lt("scanned_at", until);
    if (cohort === "flagged" || cohort === "control") {
      query = query.eq("cohort", cohort);
    }
    if (cursor) {
      const [scannedAt, id] = cursor as [string, string];
      query = query.or(
        `scanned_at.gt.${scannedAt},and(scanned_at.eq.${scannedAt},id.gt.${id})`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const last = rows[rows.length - 1];

    return NextResponse.json({
      version: 1,
      generatedAt: new Date().toISOString(),
      rows,
      nextCursor:
        rows.length === limit && last
          ? encodeCursor([last.scanned_at, last.id])
          : null,
    });
  } catch (error) {
    captureAPIError(error, { route: "export/snapshots" });
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
