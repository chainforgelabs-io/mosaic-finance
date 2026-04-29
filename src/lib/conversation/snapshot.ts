import type { SupabaseClient } from "@supabase/supabase-js";

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(v).toLocaleString("en-CA")}`;
}

type HoldingRow = {
  ticker?: string;
  name?: string;
  balance?: number;
  units?: number | null;
};

function summarizeHoldingsLine(
  holdings: unknown,
  totalValue: number | null,
): string {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return totalValue != null ? fmtMoney(totalValue) : "—";
  }
  const rows = holdings
    .filter((h): h is HoldingRow => h != null && typeof h === "object")
    .map((h) => ({
      label: String(h.ticker || h.name || "holding"),
      bal: Number(h.balance) || 0,
    }))
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 3);
  const parts = rows.map((r) => `${r.label} ${fmtMoney(r.bal)}`);
  const suffix =
    Array.isArray(holdings) && holdings.length > 3
      ? ` (+${holdings.length - 3} more)`
      : "";
  return `${parts.join(", ")}${suffix} — acct total ${fmtMoney(totalValue)}`;
}

type DebtRow = {
  type?: string;
  amount?: number;
  balance?: number;
  rate?: number | null;
  monthly_payment?: number | null;
};

function formatDebts(majorDebts: unknown): string[] {
  if (!Array.isArray(majorDebts)) return [];
  return majorDebts
    .filter((d): d is DebtRow => d != null && typeof d === "object")
    .map((d) => {
      const type = d.type ?? "debt";
      const bal = d.balance ?? d.amount ?? 0;
      const rate = d.rate != null ? `@ ${Number(d.rate)}%` : "";
      const pmt =
        d.monthly_payment != null
          ? `, pmt ${fmtMoney(d.monthly_payment)}/mo`
          : "";
      return `  - ${type}: ${fmtMoney(bal)} ${rate}${pmt}`.trim();
    });
}

type GoalRow = {
  goal?: string;
  type?: string;
  target_amount?: number | null;
  target_year?: number | null;
};

function formatGoals(goals: unknown): string[] {
  if (!Array.isArray(goals)) return [];
  return goals
    .filter((g): g is GoalRow => g != null && typeof g === "object")
    .map((g) => {
      const name = g.goal ?? g.type ?? "goal";
      const amt =
        g.target_amount != null ? ` target ${fmtMoney(g.target_amount)}` : "";
      const yr = g.target_year != null ? ` by ${g.target_year}` : "";
      return `  - ${name}${amt}${yr}`;
    });
}

/**
 * Compact text block for Claude system prompts — full financial picture on file.
 * Target ~1–2k tokens; omits raw plan JSON.
 */
export async function buildClientSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const [
    userProfileRes,
    householdRes,
    financialRes,
    holdingsRes,
    fixedRes,
    riskRes,
    plansRes,
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select(
        "alias, age, sex, province, employment_type, occupation, family_structure, annual_income",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("household_members")
      .select(
        "id, relationship, age, sex, occupation, annual_income, is_dependant",
      )
      .eq("user_id", userId),
    supabase
      .from("financial_profiles")
      .select(
        "annual_income, monthly_expenses, monthly_savings, emergency_fund_months, major_debts, financial_goals, retirement_target_age, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("investment_holdings")
      .select("account_type, holdings, total_value, source")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fixed_assets")
      .select(
        "category, name, estimated_value, is_primary_residence, property_city, property_province, notes",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("risk_profiles")
      .select("risk_score, confirmed_by_user, conversational_insights, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("financial_plans")
      .select("id, version, status, created_at, updated_at")
      .eq("user_id", userId)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = userProfileRes.data;
  const household = householdRes.data ?? [];
  const fp = financialRes.data;
  const holdings = holdingsRes.data ?? [];
  const fixed = fixedRes.data ?? [];
  const risk = riskRes.data;
  const latestPlan = plansRes.data;

  const lines: string[] = [];
  const generated = new Date().toISOString().slice(0, 10);

  if (profile) {
    const bits: string[] = [];
    if (profile.alias) bits.push(`alias=${profile.alias}`);
    if (profile.age != null) bits.push(`age=${profile.age}`);
    if (profile.sex) bits.push(`sex=${profile.sex}`);
    if (profile.province) bits.push(`province=${profile.province}`);
    if (profile.employment_type)
      bits.push(`employment=${profile.employment_type}`);
    if (profile.occupation) bits.push(`occupation=${profile.occupation}`);
    if (profile.family_structure)
      bits.push(`family_structure=${profile.family_structure}`);
    if (profile.annual_income != null)
      bits.push(`primary_annual_income=${fmtMoney(Number(profile.annual_income))}`);
    if (bits.length) lines.push(`PROFILE: ${bits.join("; ")}`);
  }

  if (household.length > 0) {
    lines.push("HOUSEHOLD:");
    for (const m of household) {
      const p: string[] = [m.relationship];
      if (m.age != null) p.push(`age ${m.age}`);
      if (m.sex) p.push(String(m.sex));
      if (m.occupation) p.push(m.occupation);
      if (m.annual_income != null)
        p.push(`income ${fmtMoney(Number(m.annual_income))}`);
      if (m.is_dependant) p.push("dependant");
      lines.push(`  - ${p.join(", ")}`);
    }
  }

  const primaryInc = profile?.annual_income != null ? Number(profile.annual_income) : 0;
  const hhInc = household.reduce(
    (s, m) => s + (m.annual_income != null ? Number(m.annual_income) : 0),
    0,
  );
  const fpInc = fp?.annual_income != null ? Number(fp.annual_income) : null;
  const householdTotal =
    primaryInc + hhInc > 0
      ? primaryInc + hhInc
      : fpInc != null && fpInc > 0
        ? fpInc
        : null;
  if (householdTotal != null && householdTotal > 0) {
    lines.push(`HOUSEHOLD_INCOME_ESTIMATE: ${fmtMoney(householdTotal)}/yr (primary + household members; verify against profile)`);
  }

  if (fp) {
    lines.push("CASHFLOW_AND_GOALS (latest financial_profiles row):");
    if (fp.monthly_expenses != null)
      lines.push(`  monthly_expenses: ${fmtMoney(Number(fp.monthly_expenses))}`);
    if (fp.monthly_savings != null)
      lines.push(`  monthly_savings: ${fmtMoney(Number(fp.monthly_savings))}`);
    if (fp.emergency_fund_months != null)
      lines.push(`  emergency_fund_months: ${fp.emergency_fund_months}`);
    if (fp.retirement_target_age != null)
      lines.push(`  retirement_target_age: ${fp.retirement_target_age}`);
    const debts = formatDebts(fp.major_debts);
    if (debts.length) {
      lines.push("  debts:");
      lines.push(...debts);
    }
    const goals = formatGoals(fp.financial_goals);
    if (goals.length) {
      lines.push("  goals:");
      lines.push(...goals);
    }
  }

  if (holdings.length > 0) {
    lines.push("INVESTMENT_ACCOUNTS:");
    for (const row of holdings) {
      const tv = row.total_value != null ? Number(row.total_value) : null;
      lines.push(
        `  - ${row.account_type}: ${summarizeHoldingsLine(row.holdings, tv)}`,
      );
    }
  }

  if (fixed.length > 0) {
    lines.push("FIXED_ASSETS:");
    for (const a of fixed) {
      const loc = [a.property_city, a.property_province]
        .filter(Boolean)
        .join(", ");
      const prim = a.is_primary_residence ? " (primary)" : "";
      lines.push(
        `  - ${a.category} — ${a.name}: ${fmtMoney(Number(a.estimated_value))}${prim}${loc ? ` — ${loc}` : ""}`,
      );
    }
  }

  if (risk) {
    lines.push(
      `RISK_PROFILE: score=${risk.risk_score}, user_confirmed=${risk.confirmed_by_user ?? false}`,
    );
  }

  if (latestPlan) {
    lines.push(
      `LATEST_PLAN_ROW: version=${latestPlan.version ?? 1}, status=${latestPlan.status}, id=${latestPlan.id}, updated=${latestPlan.updated_at ?? latestPlan.created_at}`,
    );
  }

  if (lines.length === 0) return "";

  return `<CLIENT_FINANCIAL_SNAPSHOT generated="${generated}">\n${lines.join("\n")}\n</CLIENT_FINANCIAL_SNAPSHOT>`;
}
