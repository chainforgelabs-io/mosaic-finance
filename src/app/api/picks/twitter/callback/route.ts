import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { captureAPIError } from "@/lib/sentry";
import { exchangeCode, fetchMe } from "@/lib/signals/x-oauth";

function redirectToPicks(request: NextRequest, params?: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.redirect(
    `${base.replace(/\/$/, "")}/dashboard/market-context${params || ""}`,
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("x_oauth_state")?.value;
    const codeVerifier = cookieStore.get("x_oauth_verifier")?.value;
    cookieStore.delete("x_oauth_state");
    cookieStore.delete("x_oauth_verifier");

    if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
      return redirectToPicks(request, "?x_connect=failed");
    }

    const tokens = await exchangeCode(code, codeVerifier);
    const me = await fetchMe(tokens.access_token);

    const { error } = await supabase.from("x_oauth_tokens").upsert(
      {
        user_id: user.id,
        x_user_id: me.id,
        x_username: me.username,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: new Date(
          Date.now() + (tokens.expires_in || 7200) * 1000,
        ).toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;

    return redirectToPicks(request, "?x_connect=success");
  } catch (error) {
    captureAPIError(error, { route: "picks/twitter/callback" });
    return redirectToPicks(request, "?x_connect=failed");
  }
}
