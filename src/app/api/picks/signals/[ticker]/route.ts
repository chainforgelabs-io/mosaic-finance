import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
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

    const { ticker: raw } = await params;
    const ticker = raw.toUpperCase();

    const [signalRes, recentRes, takesRes] = await Promise.all([
      supabase
        .from("ticker_signals")
        .select("*")
        .eq("ticker", ticker)
        .maybeSingle(),
      supabase
        .from("raw_signals")
        .select("*")
        .eq("ticker", ticker)
        .order("occurred_at", { ascending: false })
        .limit(25),
      supabase
        .from("ticker_persona_takes")
        .select("*")
        .eq("ticker", ticker)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false }),
    ]);

    if (signalRes.error) throw signalRes.error;

    return NextResponse.json({
      signal: signalRes.data ?? null,
      recentSignals: recentRes.data || [],
      takes: takesRes.data || [],
    });
  } catch (error) {
    captureAPIError(error, { route: "picks/signals/[ticker]" });
    return NextResponse.json(
      { error: "Unable to load ticker detail." },
      { status: 500 },
    );
  }
}
