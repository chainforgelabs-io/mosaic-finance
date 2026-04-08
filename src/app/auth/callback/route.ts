import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingProgress } from "@/lib/actions/onboarding";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (next === "/reset-password") {
          return NextResponse.redirect(`${origin}/reset-password`);
        }

        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          await supabase.from("user_profiles").insert({
            id: user.id,
            alias:
              user.user_metadata?.full_name?.split(" ")[0] ??
              `user_${user.id.slice(0, 6)}`,
            subscription_tier: "snapshot",
          });
        }

        const progress = await getOnboardingProgress();
        return NextResponse.redirect(`${origin}${progress.redirectPath}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
