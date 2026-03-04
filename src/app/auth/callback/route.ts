import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id, onboarding_completed")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          await supabase.from("user_profiles").insert({
            id: user.id,
            email: user.email,
            alias: user.user_metadata?.full_name?.split(" ")[0] ?? `user_${user.id.slice(0, 6)}`,
            tier: "free",
            onboarding_completed: false,
          });
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        const redirectTo = existingProfile.onboarding_completed ? "/dashboard" : "/onboarding";
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
