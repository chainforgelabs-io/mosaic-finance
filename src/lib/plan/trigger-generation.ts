import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  claudeChatStreaming,
  ClaudeTruncationError,
} from "@/lib/claude/client";
import { buildPlanGenerationPrompt } from "@/lib/claude/prompts/plan-generation";
import { getMarketContext } from "@/lib/market-data/alpha-vantage";
import { generatePDF } from "@/lib/pdf/report-generator";
import { sendPlanDeliveryEmail } from "@/lib/resend/client";
import { captureAPIError } from "@/lib/sentry";

export type TriggerPlanGenerationResult =
  | { success: true; planId: string; status: string; resumed?: boolean }
  | { success: false; error: string; statusCode: number };

/**
 * Starts background Progress Report generation (same pipeline as POST /api/plan/generate).
 * Uses `after()` so the caller can return HTTP response immediately.
 */
export async function triggerPlanGeneration(
  userId: string,
  options?: { skipRateLimit?: boolean },
): Promise<TriggerPlanGenerationResult> {
  const skipRateLimit = options?.skipRateLimit ?? false;

  if (!skipRateLimit) {
    const { ratelimit } = await import("@/lib/ratelimit");
    const { success } = await ratelimit.planGeneration.limit(userId);
    if (!success) {
      return {
        success: false,
        error: "Progress report generation limit reached. Please try again later.",
        statusCode: 429,
      };
    }
  }

  const supabase = createServiceClient();

  const { data: existingPlan } = await supabase
    .from("financial_plans")
    .select("id, status")
    .eq("user_id", userId)
    .in("status", ["generating", "pending_review", "approved", "delivered"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlan) {
    return {
      success: true,
      planId: existingPlan.id,
      status: existingPlan.status,
      resumed: true,
    };
  }

  const { data: generatingPlan, error: insertError } = await supabase
    .from("financial_plans")
    .insert({
      user_id: userId,
      plan_data: {},
      status: "generating",
    })
    .select("id")
    .single();

  if (insertError || !generatingPlan) {
    console.error("[triggerPlanGeneration] Initial insert failed:", insertError);
    return {
      success: false,
      error: "Failed to start progress report generation.",
      statusCode: 500,
    };
  }

  const planId = generatingPlan.id;

  after(async () => {
    await runPlanGenerationBackground(userId, planId);
  });

  return { success: true, planId, status: "generating" };
}

async function runPlanGenerationBackground(
  userId: string,
  planId: string,
): Promise<void> {
  const t0 = Date.now();
  const svc = createServiceClient();
  try {
    console.log(
      `[plan/generate:bg] background start user=${userId} planId=${planId}`,
    );

    const { data: userProfile } = await svc
      .from("user_profiles")
      .select(
        "subscription_tier, alias, age, province, employment_type, family_structure",
      )
      .eq("id", userId)
      .single();

    const [financialProfile, holdings, riskProfile, fixedAssetsResult] =
      await Promise.all([
        svc
          .from("financial_profiles")
          .select(
            "annual_income, monthly_expenses, monthly_savings, emergency_fund_months, major_debts, financial_goals, retirement_target_age",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        svc
          .from("investment_holdings")
          .select("account_type, holdings, total_value")
          .eq("user_id", userId),
        svc
          .from("risk_profiles")
          .select("risk_score, conversational_insights")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        svc
          .from("fixed_assets")
          .select("category, name, estimated_value, is_primary_residence, notes")
          .eq("user_id", userId),
      ]);
    const fixedAssets = fixedAssetsResult.data;

    let marketContext: Record<string, unknown> | null = null;
    try {
      marketContext = (await getMarketContext()) as unknown as Record<
        string,
        unknown
      >;
    } catch (err) {
      console.error("[plan/generate:bg] Market context fetch failed:", err);
      captureAPIError(err, {
        route: "plan/generate:bg",
        userId,
        step: "market_context_fetch",
      });
    }

    const { data: factFindSession } = await svc
      .from("conversation_sessions")
      .select("metadata")
      .eq("user_id", userId)
      .eq("session_type", "fact-find")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const rawExtracted =
      typeof factFindSession?.metadata === "object"
        ? (factFindSession.metadata as Record<string, unknown>)?.extracted_data
        : null;
    const factFindData =
      rawExtracted && typeof rawExtracted === "object"
        ? {
            insurance_coverage: (rawExtracted as Record<string, unknown>)
              .insurance_coverage,
            detected_flags: (rawExtracted as Record<string, unknown>)
              .detected_flags,
            special_situation_notes: (rawExtracted as Record<string, unknown>)
              .special_situation_notes,
            investment_knowledge: (rawExtracted as Record<string, unknown>)
              .investment_knowledge,
          }
        : null;

    const { data: householdMembers } = await svc
      .from("household_members")
      .select("relationship, age, occupation, annual_income, is_dependant")
      .eq("user_id", userId);

    const detectedFlags = (
      factFindData as Record<string, unknown> | null
    )?.detected_flags as Record<string, boolean> | undefined;
    const userFlags = {
      isDivorced: detectedFlags?.is_divorced_or_separated ?? false,
      isBusinessOwner: detectedFlags?.is_business_owner ?? false,
      isSelfEmployed:
        detectedFlags?.is_self_employed ??
        userProfile?.employment_type === "self-employed",
      hasUSProperty: detectedFlags?.has_us_property ?? false,
      hasUSIncome: detectedFlags?.has_us_income ?? false,
      isSnowbird: detectedFlags?.is_snowbird ?? false,
    };

    const userData = {
      profile: financialProfile.data,
      userProfile: userProfile
        ? {
            alias: userProfile.alias,
            age: userProfile.age,
            province: userProfile.province,
            employment_type: userProfile.employment_type,
            family_structure: userProfile.family_structure,
          }
        : null,
      holdings: holdings.data,
      fixedAssets: fixedAssets ?? null,
      riskProfile: riskProfile.data,
      factFindData,
      householdMembers: householdMembers ?? null,
      marketContext,
      generatedAt: new Date().toISOString(),
      userFlags,
    };

    let planJson: string;
    try {
      planJson = await claudeChatStreaming(
        [{ role: "user", content: "Generate the complete progress report now." }],
        buildPlanGenerationPrompt(userData),
        { maxTokens: 12000, model: "opus" },
      );
    } catch (err) {
      const step =
        err instanceof ClaudeTruncationError ? "claude_truncated" : "claude_chat";
      console.error(`[plan/generate:bg] CLAUDE FAILED (${step}):`, err);
      captureAPIError(err, { route: "plan/generate:bg", userId, step });
      await svc.from("financial_plans").update({ status: "failed" }).eq("id", planId);
      return;
    }

    let planData: Record<string, unknown>;
    try {
      const jsonMatch = planJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      planData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (parseErr) {
      console.error("[plan/generate:bg] JSON PARSE FAILED:", parseErr);
      captureAPIError(new Error("Plan generation produced invalid JSON"), {
        route: "plan/generate:bg",
        userId,
        step: "json_parse",
      });
      await svc.from("financial_plans").update({ status: "failed" }).eq("id", planId);
      return;
    }

    let pdfPath: string | null = null;
    try {
      const pdfBuffer = await generatePDF(planData, userId);
      const path = `${userId}/${planId}.pdf`;
      const { error: uploadError } = await svc.storage
        .from("reports")
        .upload(path, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (uploadError) {
        console.error("[plan/generate:bg] PDF upload failed:", uploadError);
        captureAPIError(uploadError, {
          route: "plan/generate:bg",
          userId,
          planId,
          step: "pdf_upload",
        });
      } else {
        pdfPath = path;
      }
    } catch (pdfErr) {
      console.error("[plan/generate:bg] PDF generation failed:", pdfErr);
      captureAPIError(pdfErr, {
        route: "plan/generate:bg",
        userId,
        planId,
        step: "pdf_generate",
      });
    }

    const deliveredAt = new Date().toISOString();
    const { error: updateError } = await svc
      .from("financial_plans")
      .update({
        plan_data: planData,
        status: "delivered",
        delivered_at: deliveredAt,
        pdf_url: pdfPath,
      })
      .eq("id", planId);

    if (updateError) {
      console.error("[plan/generate:bg] DB UPDATE FAILED:", updateError);
      captureAPIError(updateError, {
        route: "plan/generate:bg",
        userId,
        step: "plan_update",
      });
      return;
    }

    const isAdvisor = userProfile?.subscription_tier === "advisor";
    const slaDeadline = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: queueError } = await svc.from("approval_queue").insert({
      plan_id: planId,
      user_id: userId,
      priority: isAdvisor ? "priority" : "standard",
      sla_deadline: slaDeadline,
    });

    if (queueError) {
      console.error("[plan/generate:bg] QA queue insert failed:", queueError);
      captureAPIError(queueError, {
        route: "plan/generate:bg",
        userId,
        planId,
        step: "approval_queue_insert",
      });
    }

    try {
      const { data: authData } = await svc.auth.admin.getUserById(userId);
      const ownerEmail = authData.user?.email;
      if (ownerEmail) {
        await sendPlanDeliveryEmail(userId, ownerEmail, planId);
      }
    } catch (emailErr) {
      console.error("[plan/generate:bg] Delivery email failed:", emailErr);
      captureAPIError(emailErr, {
        route: "plan/generate:bg",
        userId,
        planId,
        step: "delivery_email",
      });
    }

    console.log(
      `[plan/generate:bg] SUCCESS planId=${planId} total=${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  } catch (error) {
    console.error("[plan/generate:bg] UNHANDLED ERROR:", error);
    captureAPIError(error, { route: "plan/generate:bg", userId, step: "unknown" });
  }
}
