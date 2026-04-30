import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ratelimit } from "@/lib/ratelimit";
import { triggerPlanGeneration } from "@/lib/plan/trigger-generation";
import { captureAPIError } from "@/lib/sentry";

export async function POST() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.planGeneration.limit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error:
            "Plan regeneration limit reached. Please try again later.",
        },
        { status: 429 },
      );
    }

    const svc = createServiceClient();

    const { data: generatingPlan } = await svc
      .from("financial_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "generating")
      .limit(1)
      .maybeSingle();

    if (generatingPlan?.id) {
      return NextResponse.json(
        {
          error:
            "A plan is already being generated. Wait for it to finish before regenerating.",
        },
        { status: 409 },
      );
    }

    await svc
      .from("financial_plans")
      .update({ status: "superseded" })
      .eq("user_id", user.id)
      .in("status", ["pending_review", "approved", "delivered", "rejected"]);

    const genResult = await triggerPlanGeneration(user.id, {
      skipRateLimit: true,
    });

    if (!genResult.success) {
      captureAPIError(new Error(genResult.error), {
        route: "plan/regenerate",
        userId: user.id,
      });
      return NextResponse.json(
        { error: genResult.error },
        { status: genResult.statusCode },
      );
    }

    return NextResponse.json({
      ok: true,
      planId: genResult.planId,
      planStatus: genResult.status,
      resumed: genResult.resumed ?? false,
    });
  } catch (error) {
    captureAPIError(error, { route: "plan/regenerate" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
