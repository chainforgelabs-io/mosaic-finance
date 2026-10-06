import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";
import { recordDerivedHealthScore } from "@/lib/health-score/record";
import { createClient } from "@/lib/supabase/server";
import {
  balanceGap,
  expectedBalance,
  gapBooking,
  isOutflow,
  roundMoney,
  type CashTxn,
} from "@/lib/tracking/cash-capture";
import { todayIso } from "@/lib/tracking/dates";

const slug = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);

const checkSchema = z.object({
  actual_balance: z.number().finite(),
  book: z.enum(["untracked", "lines", "none"]),
  lines: z
    .array(
      z.object({
        amount: z.number().positive(),
        category: slug,
        direction: z.enum(["in", "out"]).optional(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = checkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data: anchor } = await supabase
    .from("cash_anchors")
    .select("starting_balance, anchor_date")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!anchor) {
    return NextResponse.json({ error: "Set a starting balance first." }, { status: 400 });
  }

  const today = todayIso();
  const { data: txns, error: txnError } = await supabase
    .from("transactions")
    .select("txn_date, amount, direction")
    .eq("user_id", user.id)
    .gt("txn_date", anchor.anchor_date)
    .lte("txn_date", today);
  if (txnError) return NextResponse.json({ error: "Failed to compare balances" }, { status: 500 });

  const expected = expectedBalance(
    Number(anchor.starting_balance),
    String(anchor.anchor_date),
    (txns ?? []) as CashTxn[],
    today,
  );
  const gap = balanceGap(parsed.data.actual_balance, expected);

  if (parsed.data.book === "untracked") {
    const booking = gapBooking(parsed.data.actual_balance, expected);
    if (booking) {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        txn_date: today,
        amount: booking.amount,
        category: "untracked",
        description: "Balance check",
        direction: booking.direction,
        source: "balance_check",
        category_confirmed: true,
      });
      if (error) return NextResponse.json({ error: "Failed to book the gap" }, { status: 500 });
    }
  }

  if (parsed.data.book === "lines") {
    const lines = parsed.data.lines ?? [];
    if (Math.abs(gap) < 0.005) {
      return NextResponse.json({ error: "Nothing to break down." }, { status: 400 });
    }
    const signed = roundMoney(
      lines.reduce((sum, line) => {
        const direction = line.direction ?? (gap < 0 ? "out" : "in");
        return sum + (isOutflow(direction) ? -line.amount : line.amount);
      }, 0),
    );
    if (Math.abs(signed - gap) > 0.02) {
      return NextResponse.json({ error: "Those lines do not add up to the gap." }, { status: 400 });
    }
    const { error } = await supabase.from("transactions").insert(
      lines.map((line) => ({
        user_id: user.id,
        txn_date: today,
        amount: line.amount,
        category: line.category,
        description: "Balance check",
        direction: line.direction ?? (gap < 0 ? "out" : "in"),
        source: "balance_check" as const,
        category_confirmed: true,
      })),
    );
    if (error) return NextResponse.json({ error: "Failed to book the gap" }, { status: 500 });
  }

  const { error: checkError } = await supabase.from("balance_checks").insert({
    user_id: user.id,
    check_date: today,
    actual_balance: parsed.data.actual_balance,
    expected_balance: expected,
    gap_amount: gap,
  });
  if (checkError) return NextResponse.json({ error: "Failed to save balance check" }, { status: 500 });

  const unlocks = await awardForEvent(supabase, user.id);
  void recordDerivedHealthScore(supabase, user.id);
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);

  return NextResponse.json({ gap, expected_balance: expected, gamification });
}
