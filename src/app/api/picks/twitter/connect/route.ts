import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { captureAPIError } from "@/lib/sentry";
import {
  buildAuthorizeUrl,
  generatePkce,
  isXOAuthConfigured,
} from "@/lib/signals/x-oauth";

/** Begins the X OAuth 2.0 PKCE flow. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isXOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "X OAuth is not configured. Set X_OAUTH_CLIENT_ID and X_OAUTH_CLIENT_SECRET.",
        },
        { status: 503 },
      );
    }

    const { state, codeVerifier, codeChallenge } = generatePkce();

    const cookieStore = await cookies();
    cookieStore.set("x_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    cookieStore.set("x_oauth_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return NextResponse.redirect(buildAuthorizeUrl(state, codeChallenge));
  } catch (error) {
    captureAPIError(error, { route: "picks/twitter/connect" });
    return NextResponse.json(
      { error: "Unable to start X connection." },
      { status: 500 },
    );
  }
}
