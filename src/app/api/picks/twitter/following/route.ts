import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import { fetchFollowing, refreshToken } from "@/lib/signals/x-oauth";

const trackSchema = z.object({
  handle: z.string().min(1).max(30),
  displayName: z.string().max(80).optional(),
});

async function getValidAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ accessToken: string; xUserId: string } | null> {
  const { data: row } = await supabase
    .from("x_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    return { accessToken: row.access_token, xUserId: row.x_user_id };
  }

  if (!row.refresh_token) return null;

  const refreshed = await refreshToken(row.refresh_token);
  await supabase
    .from("x_oauth_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? row.refresh_token,
      expires_at: new Date(
        Date.now() + (refreshed.expires_in || 7200) * 1000,
      ).toISOString(),
    })
    .eq("user_id", userId);

  return { accessToken: refreshed.access_token, xUserId: row.x_user_id };
}

/** Lists accounts the connected X user follows, flagged with tracked state. */
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

    const token = await getValidAccessToken(supabase, user.id);
    if (!token) {
      return NextResponse.json(
        { error: "X account not connected." },
        { status: 409 },
      );
    }

    const [following, trackedRes] = await Promise.all([
      fetchFollowing(token.accessToken, token.xUserId),
      supabase.from("tracked_x_accounts").select("handle"),
    ]);

    const tracked = new Set(
      (trackedRes.data || []).map((a) => a.handle.toLowerCase()),
    );

    return NextResponse.json({
      following: following.map((u) => ({
        handle: u.username,
        name: u.name,
        description: u.description || "",
        followers: u.public_metrics?.followers_count ?? 0,
        tracked: tracked.has(u.username.toLowerCase()),
      })),
    });
  } catch (error) {
    captureAPIError(error, { route: "picks/twitter/following GET" });
    return NextResponse.json(
      { error: "Unable to load following list." },
      { status: 500 },
    );
  }
}

/** Promote a followed account into the tracked alpha list. */
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
    const parsed = trackSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const handle = parsed.data.handle.replace(/^@/, "");
    const { data, error } = await supabase
      .from("tracked_x_accounts")
      .insert({
        handle,
        display_name: parsed.data.displayName || handle,
        category: "general",
        weight: 0.7,
        active: true,
        source_added_via: "twitter_oauth",
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
    captureAPIError(error, { route: "picks/twitter/following POST" });
    return NextResponse.json(
      { error: "Unable to track account." },
      { status: 500 },
    );
  }
}
