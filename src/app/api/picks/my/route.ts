import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import type { TickerPersonaTake, TickerSignal, UserPick } from "@/types/picks";

const addSchema = z.object({
  ticker: z.string().min(1).max(8),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
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

    const { data: picks, error } = await supabase
      .from("user_picks")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    if (error) throw error;

    const tickers = (picks || []).map((p) => p.ticker);
    let signals: TickerSignal[] = [];
    let takes: TickerPersonaTake[] = [];

    if (tickers.length > 0) {
      const [signalsRes, takesRes] = await Promise.all([
        supabase.from("ticker_signals").select("*").in("ticker", tickers),
        supabase
          .from("ticker_persona_takes")
          .select("*")
          .in("ticker", tickers)
          .gt("expires_at", new Date().toISOString()),
      ]);
      signals = (signalsRes.data || []) as TickerSignal[];
      takes = (takesRes.data || []) as TickerPersonaTake[];
    }

    const signalMap = new Map(signals.map((s) => [s.ticker, s]));
    const enriched = ((picks || []) as UserPick[]).map((pick) => ({
      ...pick,
      signal: signalMap.get(pick.ticker) ?? null,
      takes: takes.filter((t) => t.ticker === pick.ticker),
    }));

    return NextResponse.json({ picks: enriched });
  } catch (error) {
    captureAPIError(error, { route: "picks/my GET" });
    return NextResponse.json(
      { error: "Unable to load picks." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksWrite.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = addSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_picks")
      .insert({
        user_id: user.id,
        ticker: parsed.data.ticker.toUpperCase(),
        notes: parsed.data.notes || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already in picks" },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ pick: data });
  } catch (error) {
    captureAPIError(error, { route: "picks/my POST" });
    return NextResponse.json(
      { error: "Unable to add pick." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksWrite.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const ticker = request.nextUrl.searchParams.get("ticker");
    if (!ticker) {
      return NextResponse.json({ error: "ticker required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_picks")
      .delete()
      .eq("user_id", user.id)
      .eq("ticker", ticker.toUpperCase());

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    captureAPIError(error, { route: "picks/my DELETE" });
    return NextResponse.json(
      { error: "Unable to remove pick." },
      { status: 500 },
    );
  }
}
