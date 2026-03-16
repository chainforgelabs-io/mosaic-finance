import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureAPIError } from "@/lib/sentry";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_watchlists")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      watchlist: (data || []).map((w) => ({
        id: w.id,
        userId: w.user_id,
        symbol: w.symbol,
        addedAt: w.added_at,
      })),
    });
  } catch (error) {
    captureAPIError(error, { route: "market/watchlist" });
    return NextResponse.json(
      { error: "Unable to load watchlist." },
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

    const { symbol } = await request.json();
    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_watchlists")
      .insert({ user_id: user.id, symbol: symbol.toUpperCase() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already in watchlist" },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      item: {
        id: data.id,
        userId: data.user_id,
        symbol: data.symbol,
        addedAt: data.added_at,
      },
    });
  } catch (error) {
    captureAPIError(error, { route: "market/watchlist" });
    return NextResponse.json(
      { error: "Unable to add to watchlist." },
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

    const symbol = request.nextUrl.searchParams.get("symbol");
    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_watchlists")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol.toUpperCase());

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    captureAPIError(error, { route: "market/watchlist" });
    return NextResponse.json(
      { error: "Unable to remove from watchlist." },
      { status: 500 },
    );
  }
}
