import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { captureAPIError } from "@/lib/sentry";
import {
  authorizeExport,
  decodeCursor,
  encodeCursor,
} from "@/lib/export-auth";

/**
 * GET /api/export/labels — forward-return labels, keyset paginated
 * ascending by (labeled_at, snapshot_id, horizon_days). `since` filters on
 * labeled_at so incremental pollers never miss late-arriving labels.
 * Schema: docs/export-api.md.
 *
 *   ?since=<iso>      inclusive lower bound on labeled_at
 *   ?cursor=<opaque>  from previous page's nextCursor
 *   ?limit=<n>        default 500, max 1000
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
    const cursor = decodeCursor(params.get("cursor"), 3);

    const supabase = createServiceClient();
    let query = supabase
      .from("snapshot_labels")
      .select("*")
      .order("labeled_at", { ascending: true })
      .order("snapshot_id", { ascending: true })
      .order("horizon_days", { ascending: true })
      .limit(limit);

    if (since) query = query.gte("labeled_at", since);
    if (cursor) {
      const [labeledAt, snapshotId, horizon] = cursor as [
        string,
        string,
        number,
      ];
      query = query.or(
        `labeled_at.gt.${labeledAt},` +
          `and(labeled_at.eq.${labeledAt},snapshot_id.gt.${snapshotId}),` +
          `and(labeled_at.eq.${labeledAt},snapshot_id.eq.${snapshotId},horizon_days.gt.${horizon})`,
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
          ? encodeCursor([last.labeled_at, last.snapshot_id, last.horizon_days])
          : null,
    });
  } catch (error) {
    captureAPIError(error, { route: "export/labels" });
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
