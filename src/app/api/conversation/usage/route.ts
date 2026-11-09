import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  charlieMessageUsageNotice,
  countUsageThisMonth,
  loadProfileEntitlements,
} from "@/lib/entitlements";
import { captureAPIError } from "@/lib/sentry";

/** Notice text only. The allowance size stays off this response. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entitlements = await loadProfileEntitlements(user.id, user.email);
    const cap = entitlements.charlieSoftCap;
    if (cap?.kind !== "messages") {
      return NextResponse.json({ notice: null });
    }

    const used = await countUsageThisMonth(user.id, "message");
    return NextResponse.json({
      notice: charlieMessageUsageNotice(used, cap.limit),
    });
  } catch (error) {
    captureAPIError(error, { route: "conversation/usage" });
    return NextResponse.json({ notice: null });
  }
}
