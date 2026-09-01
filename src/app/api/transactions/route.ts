import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { SPENDING_CATEGORIES } from "@/lib/tracking/categories";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";

const txnSchema = z.object({
  txn_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0),
  category: z.enum(SPENDING_CATEGORIES),
  description: z.string().max(300).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  source: z.enum(["manual", "screenshot"]).optional().default("manual"),
  document_id: z.string().uuid().optional().nullable(),
});

const batchSchema = z.object({
  transactions: z.array(txnSchema).min(1).max(200),
});

const patchSchema = txnSchema.partial().extend({
  id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (start) query = query.gte("txn_date", start);
  if (end) query = query.lte("txn_date", end);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });

  return NextResponse.json({ transactions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const asBatch = Array.isArray(body?.transactions)
    ? batchSchema.safeParse(body)
    : txnSchema.safeParse(body);

  if (!asBatch.success) {
    return NextResponse.json({ error: asBatch.error.issues[0].message }, { status: 400 });
  }

  const rows = ("transactions" in asBatch.data ? asBatch.data.transactions : [asBatch.data]).map(
    (t) => ({
      user_id: user.id,
      txn_date: t.txn_date,
      amount: t.amount,
      category: t.category,
      description: t.description ?? null,
      note: t.note ?? null,
      source: t.source ?? "manual",
      document_id: t.document_id ?? null,
    }),
  );

  const { data, error } = await supabase.from("transactions").insert(rows).select();
  if (error) return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 });

  const unlocks = await awardForEvent(supabase, user.id);
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);

  return NextResponse.json({ transactions: data ?? [], gamification }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Transaction not found or update failed" }, { status: 404 });
  }
  return NextResponse.json({ transaction: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
