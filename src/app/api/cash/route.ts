import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { expectedBalance, type CashTxn } from "@/lib/tracking/cash-capture";
import { todayIso } from "@/lib/tracking/dates";

const anchorSchema = z.object({
  starting_balance: z.number().finite(),
  anchor_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: anchor }, { data: lastCheck }] = await Promise.all([
    supabase
      .from("cash_anchors")
      .select("starting_balance, anchor_date")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("balance_checks")
      .select("check_date")
      .eq("user_id", user.id)
      .order("check_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!anchor) {
    return NextResponse.json({
      anchor: null,
      expected_balance: null,
      last_check_date: lastCheck?.check_date ?? null,
    });
  }

  const today = todayIso();
  const { data: txns, error } = await supabase
    .from("transactions")
    .select("txn_date, amount, direction")
    .eq("user_id", user.id)
    .gt("txn_date", anchor.anchor_date)
    .lte("txn_date", today);

  if (error) return NextResponse.json({ error: "Failed to load cash balance" }, { status: 500 });

  return NextResponse.json({
    anchor: {
      starting_balance: Number(anchor.starting_balance),
      anchor_date: anchor.anchor_date,
    },
    expected_balance: expectedBalance(
      Number(anchor.starting_balance),
      String(anchor.anchor_date),
      (txns ?? []) as CashTxn[],
      today,
    ),
    last_check_date: lastCheck?.check_date ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = anchorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { error } = await supabase.from("cash_anchors").upsert(
    {
      user_id: user.id,
      starting_balance: parsed.data.starting_balance,
      anchor_date: parsed.data.anchor_date,
    },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ error: "Failed to save starting balance" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
