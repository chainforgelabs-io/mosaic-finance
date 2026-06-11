import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksRead.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const params = request.nextUrl.searchParams;
    const filter = params.get("filter") || "top";
    const limit = Math.min(
      parseInt(params.get("limit") || "50", 10) || 50,
      MAX_LIMIT,
    );

    let query = supabase.from("ticker_signals").select("*");

    switch (filter) {
      case "movers":
        query = query
          .eq("big_mover", true)
          .order("composite_score", { ascending: false, nullsFirst: false });
        break;
      case "radar":
        query = query
          .eq("under_the_radar", true)
          .order("composite_score", { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order("composite_score", {
          ascending: false,
          nullsFirst: false,
        });
    }

    const { data, error } = await query.limit(limit);
    if (error) throw error;

    return NextResponse.json({ signals: data || [] });
  } catch (error) {
    captureAPIError(error, { route: "picks/signals" });
    return NextResponse.json(
      { error: "Unable to load signals." },
      { status: 500 },
    );
  }
}
