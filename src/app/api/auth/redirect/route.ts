import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingProgress } from "@/lib/actions/onboarding";

const SAFE_REDIRECT_PREFIXES = ["/dashboard", "/onboarding", "/admin"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { redirectTo: "/login", error: "Not authenticated" },
      { status: 401 },
    );
  }

  const explicit = request.nextUrl.searchParams.get("redirectTo");
  if (
    explicit &&
    SAFE_REDIRECT_PREFIXES.some((p) => explicit.startsWith(p))
  ) {
    return NextResponse.json({ redirectTo: explicit });
  }

  const progress = await getOnboardingProgress();
  return NextResponse.json({ redirectTo: progress.redirectPath });
}
