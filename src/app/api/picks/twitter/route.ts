import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureAPIError } from "@/lib/sentry";
import { isXOAuthConfigured } from "@/lib/signals/x-oauth";

/** Connection status for the Sources tab. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("x_oauth_tokens")
      .select("x_user_id, x_username, connected_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      configured: isXOAuthConfigured(),
      connection: data ?? null,
    });
  } catch (error) {
    captureAPIError(error, { route: "picks/twitter GET" });
    return NextResponse.json(
      { error: "Unable to load X connection." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("x_oauth_tokens")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    captureAPIError(error, { route: "picks/twitter DELETE" });
    return NextResponse.json(
      { error: "Unable to disconnect." },
      { status: 500 },
    );
  }
}
