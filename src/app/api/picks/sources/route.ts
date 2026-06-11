import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";

const addAccountSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(30)
    .transform((h) => h.replace(/^@/, "").trim()),
  displayName: z.string().max(80).optional(),
  category: z.string().max(40).optional(),
  weight: z.number().min(0).max(1).optional(),
});

const updateSchema = z.object({
  kind: z.enum(["x_account", "congress_member"]),
  id: z.string().uuid(),
  active: z.boolean().optional(),
  weight: z.number().min(0).max(1).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksRead.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const [accountsRes, congressRes] = await Promise.all([
      supabase
        .from("tracked_x_accounts")
        .select("*")
        .order("weight", { ascending: false }),
      supabase
        .from("tracked_congress_members")
        .select("*")
        .order("full_name"),
    ]);

    if (accountsRes.error) throw accountsRes.error;

    return NextResponse.json({
      xAccounts: accountsRes.data || [],
      congressMembers: congressRes.data || [],
    });
  } catch (error) {
    captureAPIError(error, { route: "picks/sources GET" });
    return NextResponse.json(
      { error: "Unable to load sources." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksWrite.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = addAccountSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tracked_x_accounts")
      .insert({
        handle: parsed.data.handle,
        display_name: parsed.data.displayName || parsed.data.handle,
        category: parsed.data.category || "general",
        weight: parsed.data.weight ?? 0.7,
        active: true,
        source_added_via: "manual",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Handle already tracked" },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ account: data });
  } catch (error) {
    captureAPIError(error, { route: "picks/sources POST" });
    return NextResponse.json(
      { error: "Unable to add account." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksWrite.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const table =
      parsed.data.kind === "x_account"
        ? "tracked_x_accounts"
        : "tracked_congress_members";

    const updates: Record<string, unknown> = {};
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    if (parsed.data.weight !== undefined && parsed.data.kind === "x_account") {
      updates.weight = parsed.data.weight;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq("id", parsed.data.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error) {
    captureAPIError(error, { route: "picks/sources PATCH" });
    return NextResponse.json(
      { error: "Unable to update source." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksWrite.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("tracked_x_accounts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    captureAPIError(error, { route: "picks/sources DELETE" });
    return NextResponse.json(
      { error: "Unable to remove account." },
      { status: 500 },
    );
  }
}
