import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ApplyAnnualReviewBodySchema,
  RISK_SCORE_VALUES,
} from "@/lib/validators/conversation";
import { triggerPlanGeneration } from "@/lib/plan/trigger-generation";
import { captureAPIError } from "@/lib/sentry";
import { upsertGoalsFromExtracted } from "@/lib/tracking/sync-goals";

type DebtRow = {
  type: string;
  amount?: number;
  balance?: number;
  rate?: number | null;
  monthly_payment?: number | null;
};

type GoalRow = {
  goal: string;
  target_amount?: number | null;
  target_year?: number | null;
};

function sectionEnabled(
  apply: Record<string, boolean> | undefined,
  key: string,
): boolean {
  if (apply == null) return true;
  if (Object.keys(apply).length === 0) return true;
  return apply[key] === true;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function normalizeDebtFromExtracted(d: Record<string, unknown>): DebtRow {
  const balance = Number(d.balance ?? 0);
  return {
    type: String(d.type ?? "debt"),
    balance,
    amount: balance,
    rate: d.rate != null ? Number(d.rate) : null,
    monthly_payment:
      d.monthly_payment != null ? Number(d.monthly_payment) : null,
  };
}

function isValidRiskScore(s: string): boolean {
  return (RISK_SCORE_VALUES as readonly string[]).includes(s);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await ctx.params;
    const parsedBody = ApplyAnnualReviewBodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.flatten() },
        { status: 400 },
      );
    }
    const { apply, extracted } = parsedBody.data;

    if (apply != null && Object.keys(apply).length > 0) {
      const any = Object.values(apply).some(Boolean);
      if (!any) {
        return NextResponse.json(
          { error: "Select at least one section to apply." },
          { status: 400 },
        );
      }
    }

    const svc = createServiceClient();

    const { data: session, error: sessErr } = await svc
      .from("conversation_sessions")
      .select("id, user_id, session_type, status, metadata")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.session_type !== "annual-review") {
      return NextResponse.json(
        { error: "Not an annual review session" },
        { status: 400 },
      );
    }

    if (session.status !== "completed") {
      return NextResponse.json(
        { error: "Annual review is not complete yet" },
        { status: 400 },
      );
    }

    const meta =
      session.metadata && typeof session.metadata === "object"
        ? (session.metadata as Record<string, unknown>)
        : {};

    if (meta.applied_at) {
      return NextResponse.json(
        { error: "Changes from this review were already applied" },
        { status: 400 },
      );
    }

    const extractedData = meta.extracted_data as Record<string, unknown> | undefined;
    if (!extractedData || typeof extractedData !== "object") {
      return NextResponse.json(
        { error: "No extracted review data on this session" },
        { status: 400 },
      );
    }

    const { data: generatingRow } = await svc
      .from("financial_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "generating")
      .maybeSingle();

    if (generatingRow) {
      return NextResponse.json(
        {
          error:
            "A plan is already generating. Wait for it to finish before applying changes.",
        },
        { status: 409 },
      );
    }

    const { data: latestFp } = await svc
      .from("financial_profiles")
      .select(
        "annual_income, monthly_expenses, monthly_savings, emergency_fund_months, major_debts, financial_goals, retirement_target_age",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextAnnualIncome = latestFp?.annual_income != null
      ? Number(latestFp.annual_income)
      : null;
    let nextMonthlyExpenses = latestFp?.monthly_expenses != null
      ? Number(latestFp.monthly_expenses)
      : null;
    let nextMonthlySavings = latestFp?.monthly_savings != null
      ? Number(latestFp.monthly_savings)
      : null;
    const nextEmergencyMonths = latestFp?.emergency_fund_months != null
      ? Number(latestFp.emergency_fund_months)
      : null;
    const nextRetirementAge = latestFp?.retirement_target_age ?? null;

    const majorDebts: DebtRow[] = Array.isArray(latestFp?.major_debts)
      ? (latestFp!.major_debts as DebtRow[]).map((d) => ({
          type: d.type,
          amount: d.amount ?? d.balance,
          balance: d.balance ?? d.amount ?? 0,
          rate: d.rate ?? null,
          monthly_payment: d.monthly_payment ?? null,
        }))
      : [];

    let financialGoals: GoalRow[] = Array.isArray(latestFp?.financial_goals)
      ? (latestFp!.financial_goals as GoalRow[]).map((g) => ({
          goal: g.goal,
          target_amount: g.target_amount ?? null,
          target_year: g.target_year ?? null,
        }))
      : [];

    // Merge `extracted` from the request over the session copy (user edits in UI)
    const merged = { ...extractedData, ...extracted };

    const incomePatch = asRecord(merged.income_changes);
    if (
      sectionEnabled(apply, "income_changes") &&
      incomePatch &&
      incomePatch.new_household_income != null
    ) {
      nextAnnualIncome = Number(incomePatch.new_household_income);
    }

    const expensePatch = asRecord(merged.expense_changes);
    if (sectionEnabled(apply, "expense_changes") && expensePatch) {
      if (expensePatch.new_monthly_expenses != null) {
        nextMonthlyExpenses = Number(expensePatch.new_monthly_expenses);
      }
      if (expensePatch.new_monthly_savings != null) {
        nextMonthlySavings = Number(expensePatch.new_monthly_savings);
      }
    }

    if (sectionEnabled(apply, "new_debts") && Array.isArray(merged.new_debts)) {
      for (const row of merged.new_debts) {
        const r = asRecord(row);
        if (r) majorDebts.push(normalizeDebtFromExtracted(r));
      }
    }

    if (sectionEnabled(apply, "goal_updates") && Array.isArray(merged.goal_updates)) {
      for (const row of merged.goal_updates) {
        const r = asRecord(row);
        if (!r) continue;
        const gname = String(r.goal ?? "");
        const change = String(r.change ?? "");
        if (change === "removed") {
          financialGoals = financialGoals.filter((g) => g.goal !== gname);
        } else if (change === "new") {
          financialGoals.push({
            goal: gname,
            target_amount: null,
            target_year: null,
          });
        }
      }
    }

    if (
      sectionEnabled(apply, "goal_amount_or_timeline_changes") &&
      Array.isArray(merged.goal_amount_or_timeline_changes)
    ) {
      for (const row of merged.goal_amount_or_timeline_changes) {
        const r = asRecord(row);
        if (!r) continue;
        const gname = String(r.goal ?? "");
        const g = financialGoals.find((x) => x.goal === gname);
        if (g) {
          if (r.new_target_amount != null)
            g.target_amount = Number(r.new_target_amount);
          if (r.new_target_year != null)
            g.target_year = Number(r.new_target_year);
        }
      }
    }

    if (
      sectionEnabled(apply, "household_changes") &&
      asRecord(merged.household_changes)
    ) {
      const hc = asRecord(merged.household_changes)!;
      const added = Array.isArray(hc.added) ? hc.added : [];
      for (const row of added) {
        const r = asRecord(row);
        if (!r) continue;
        const relationship = String(r.relationship ?? "other");
        const allowed = ["spouse", "child", "parent", "sibling", "other"];
        const rel = allowed.includes(relationship) ? relationship : "other";
        const sexRaw =
          r.sex != null && typeof r.sex === "string" ? r.sex : null;
        const sexAllowed = [
          "male",
          "female",
          "other",
          "prefer-not-to-say",
        ] as const;
        const sexVal = sexRaw && sexAllowed.includes(sexRaw as (typeof sexAllowed)[number])
          ? sexRaw
          : null;
        await svc.from("household_members").insert({
          user_id: user.id,
          relationship: rel,
          age: r.age != null ? Number(r.age) : null,
          sex: sexVal,
          occupation: r.occupation != null ? String(r.occupation) : null,
          annual_income:
            r.annual_income != null ? Number(r.annual_income) : 0,
          is_dependant: Boolean(r.is_dependant),
        });
      }

      const modified = Array.isArray(hc.modified) ? hc.modified : [];
      for (const row of modified) {
        const r = asRecord(row);
        if (!r) continue;
        const relHint = String(r.relationship ?? "");
        const { data: members } = await svc
          .from("household_members")
          .select("id, relationship")
          .eq("user_id", user.id);
        const match = (members ?? []).find(
          (m) => m.relationship === relHint,
        );
        if (match) {
          const patch: Record<string, unknown> = {};
          if (r.annual_income != null)
            patch.annual_income = Number(r.annual_income);
          if (r.occupation != null) patch.occupation = String(r.occupation);
          if (r.age != null) patch.age = Number(r.age);
          if (Object.keys(patch).length > 0) {
            await svc
              .from("household_members")
              .update(patch)
              .eq("id", match.id);
          }
        }
      }
    }

    const primaryIncomePatch = incomePatch;
    if (
      sectionEnabled(apply, "income_changes") &&
      primaryIncomePatch?.new_primary_income != null
    ) {
      await svc
        .from("user_profiles")
        .update({
          annual_income: Number(primaryIncomePatch.new_primary_income),
        })
        .eq("id", user.id);
    }

    if (
      sectionEnabled(apply, "holdings_changes") &&
      Array.isArray(merged.holdings_changes)
    ) {
      for (const row of merged.holdings_changes) {
        const r = asRecord(row);
        if (!r) continue;
        const accountType = String(r.account_type ?? "");
        if (!accountType) continue;
        const action = String(r.action ?? "updated");
        const approx =
          r.approximate_value != null ? Number(r.approximate_value) : null;

        const { data: existing } = await svc
          .from("investment_holdings")
          .select("id")
          .eq("user_id", user.id)
          .eq("account_type", accountType)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (action === "closed" && existing?.id) {
          await svc.from("investment_holdings").delete().eq("id", existing.id);
          continue;
        }

        if (action === "added" || action === "updated") {
          if (existing?.id) {
            const upd: Record<string, unknown> = {};
            if (approx != null) upd.total_value = approx;
            if (Object.keys(upd).length > 0) {
              await svc
                .from("investment_holdings")
                .update(upd)
                .eq("id", existing.id);
            }
          } else {
            await svc.from("investment_holdings").insert({
              user_id: user.id,
              account_type: accountType,
              holdings: [],
              total_value: approx ?? 0,
              source: "manual",
            });
          }
        }
      }
    }

    if (
      sectionEnabled(apply, "fixed_asset_changes") &&
      Array.isArray(merged.fixed_asset_changes)
    ) {
      for (const row of merged.fixed_asset_changes) {
        const r = asRecord(row);
        if (!r) continue;
        const category = String(r.category ?? "other");
        const allowedCat = [
          "real_estate",
          "vehicle",
          "land",
          "precious_metals",
          "collectibles",
          "other",
        ];
        const cat = allowedCat.includes(category) ? category : "other";
        const name = String(r.name ?? "Asset");
        const action = String(r.action ?? "added");
        const value =
          r.estimated_value != null ? Number(r.estimated_value) : 0;

        const { data: matchFa } = await svc
          .from("fixed_assets")
          .select("id")
          .eq("user_id", user.id)
          .eq("category", cat)
          .ilike("name", name)
          .limit(1)
          .maybeSingle();

        if (action === "sold" && matchFa?.id) {
          await svc.from("fixed_assets").delete().eq("id", matchFa.id);
          continue;
        }

        if (action === "updated" && matchFa?.id) {
          const faPatch: Record<string, unknown> = {
            estimated_value: value,
          };
          if (r.is_primary_residence != null) {
            faPatch.is_primary_residence = Boolean(r.is_primary_residence);
          }
          if (r.property_city != null) {
            faPatch.property_city = String(r.property_city);
          }
          if (r.property_province != null) {
            faPatch.property_province = String(r.property_province);
          }
          await svc.from("fixed_assets").update(faPatch).eq("id", matchFa.id);
          continue;
        }

        if (action === "added" || action === "updated") {
          if (action === "updated" && matchFa?.id) continue;
          await svc.from("fixed_assets").insert({
            user_id: user.id,
            category: cat as
              | "real_estate"
              | "vehicle"
              | "land"
              | "precious_metals"
              | "collectibles"
              | "other",
            name,
            estimated_value: value,
            is_primary_residence: Boolean(r.is_primary_residence),
            property_city:
              r.property_city != null ? String(r.property_city) : null,
            property_province:
              r.property_province != null ? String(r.property_province) : null,
            notes: r.description != null ? String(r.description) : null,
          });
        }
      }
    }

    const riskPatch = asRecord(merged.risk_tolerance_change);
    if (
      sectionEnabled(apply, "risk_tolerance_change") &&
      riskPatch &&
      riskPatch.changed === true &&
      riskPatch.new_risk_score != null &&
      typeof riskPatch.new_risk_score === "string" &&
      isValidRiskScore(riskPatch.new_risk_score)
    ) {
      await svc.from("risk_profiles").insert({
        user_id: user.id,
        risk_score: riskPatch.new_risk_score,
        confirmed_by_user: true,
        questionnaire_responses: { source: "annual_review_apply" },
      });
    }

    const { error: insertFpErr } = await svc.from("financial_profiles").insert({
      user_id: user.id,
      annual_income: nextAnnualIncome,
      monthly_expenses: nextMonthlyExpenses,
      monthly_savings: nextMonthlySavings,
      emergency_fund_months: nextEmergencyMonths,
      major_debts: majorDebts.length ? majorDebts : null,
      financial_goals: financialGoals.length ? financialGoals : null,
      retirement_target_age: nextRetirementAge,
    });

    if (insertFpErr) {
      captureAPIError(insertFpErr, {
        route: "conversation/apply-changes",
        userId: user.id,
        step: "financial_profiles_insert",
      });
      return NextResponse.json(
        { error: "Failed to save financial profile" },
        { status: 500 },
      );
    }

    if (financialGoals.length > 0) {
      await upsertGoalsFromExtracted(
        svc,
        user.id,
        financialGoals.map((g) => ({
          goal: g.goal,
          type: g.goal,
          target_amount: g.target_amount ?? null,
          target_year: g.target_year ?? null,
        })),
        "manual",
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
        route: "conversation/apply-changes",
        userId: user.id,
        step: "triggerPlanGeneration",
      });
      return NextResponse.json(
        { error: genResult.error, code: "PLAN_GEN_NOT_STARTED" },
        { status: genResult.statusCode },
      );
    }

    const nextMeta = {
      ...meta,
      applied_at: new Date().toISOString(),
    };

    await svc
      .from("conversation_sessions")
      .update({ metadata: nextMeta })
      .eq("id", sessionId);

    return NextResponse.json({
      ok: true,
      planId: genResult.planId,
      planStatus: genResult.status,
      resumed: genResult.resumed ?? false,
    });
  } catch (error) {
    captureAPIError(error, { route: "conversation/apply-changes" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
