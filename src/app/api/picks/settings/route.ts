import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import type { PicksMode, PicksSettingsRow } from "@/types/picks";

const patchSchema = z.object({
  mode: z.enum(["light", "heavy"]),
});

function serializeSettings(row: {
  user_id: string;
  mode: string;
  last_changed_at: string;
}): PicksSettingsRow {
  return {
    user_id: row.user_id,
    mode: row.mode as PicksMode,
    last_changed_at: row.last_changed_at,
  };
}

/** Ensure a row exists for the authenticated user (RLS-insert). */
async function ensurePicksSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ row: Record<string, unknown> }> {
  const { data: existing, error: selectErr } = await supabase
    .from("picks_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectErr) throw selectErr;

  if (existing) {
    return { row: existing };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("picks_settings")
    .insert({
      user_id: userId,
      mode: "light",
      last_changed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertErr) throw insertErr;
  return { row: inserted! };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksSettings.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { row } = await ensurePicksSettings(supabase, user.id);

    return NextResponse.json({
      settings: serializeSettings(
        row as { user_id: string; mode: string; last_changed_at: string },
      ),
    });
  } catch (error) {
    captureAPIError(error, { route: "picks/settings", method: "GET" });
    return NextResponse.json(
      { error: "Unable to load picks settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksSettings.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await ensurePicksSettings(supabase, user.id);

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("picks_settings")
      .update({
        mode: parsed.data.mode,
        last_changed_at: now,
      })
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      settings: serializeSettings(
        updated as { user_id: string; mode: string; last_changed_at: string },
      ),
    });
  } catch (error) {
    captureAPIError(error, { route: "picks/settings", method: "PATCH" });
    return NextResponse.json(
      { error: "Unable to update picks settings." },
      { status: 500 },
    );
  }
}
