import type { GoalRow, SnapshotBreakdown, SnapshotBreakdownItem } from "@/types/tracking";

export const GOAL_CLASSES = ["balance", "debt", "retirement_age", "retirement_income", "note"] as const;
export type GoalClass = (typeof GOAL_CLASSES)[number];

export const GOAL_CLASS_LABELS: Record<GoalClass, string> = {
  balance: "Save toward an amount",
  debt: "Pay off a debt",
  retirement_age: "Retire at an age",
  retirement_income: "Retirement income",
  note: "Open note",
};

export interface GoalAccount {
  key: string;
  name: string;
  value: number;
  side: "asset" | "debt";
}

export function inferGoalClass(input: {
  name: string;
  goalType?: string | null;
  amountUnknown?: boolean;
  targetAmount?: number | null;
  targetAge?: number | null;
}): GoalClass {
  const name = input.name.toLowerCase();
  const type = (input.goalType ?? "").toLowerCase();
  const text = `${name} ${type}`;
  if (/retirement income|income in retirement|income when i retire/.test(text)) return "retirement_income";

  const buyingHome =
    type === "home_purchase" ||
    /down payment|buy a home|buy a house|home purchase|purchase a home|purchase a house/.test(text);
  const payingDebt =
    type === "debt_payoff" ||
    /pay off|payoff|pay down|paydown|student loan|line of credit|credit card debt|\bdebt\b|\bloan\b/.test(text) ||
    (/\bmortgage\b/.test(text) && !buyingHome);
  if (payingDebt && !buyingHome) return "debt";

  const retiring = type === "retirement" || /retire|retirement|pension/.test(text) || /\bat \d{2}\b/.test(text);
  if (retiring) {
    if (/income/.test(name)) return "retirement_income";
    return "retirement_age";
  }

  const openNote =
    /maintain|cost of living|lifestyle|not sure/.test(name) ||
    (input.amountUnknown && (type === "other" || type === ""));
  if (openNote) return "note";
  return "balance";
}

export function goalClassOf(goal: Pick<GoalRow, "name" | "goal_type" | "amount_unknown" | "target_amount" | "target_age"> & {
  tracking_class?: string | null;
}): GoalClass {
  if (goal.tracking_class && (GOAL_CLASSES as readonly string[]).includes(goal.tracking_class)) {
    return goal.tracking_class as GoalClass;
  }
  return inferGoalClass({
    name: goal.name,
    goalType: goal.goal_type,
    amountUnknown: goal.amount_unknown,
    targetAmount: goal.target_amount,
    targetAge: goal.target_age,
  });
}

export function accountKey(item: SnapshotBreakdownItem, side: "asset" | "debt"): string {
  if (item.id) return item.id;
  return `${side}:${item.account_type ?? ""}:${item.name ?? item.type ?? ""}`;
}

export function accountsFromBreakdown(breakdown: SnapshotBreakdown | null | undefined): GoalAccount[] {
  if (!breakdown) return [];
  const assets = [...(breakdown.investments ?? []), ...(breakdown.fixed_assets ?? [])];
  return [
    ...assets.map((item) => ({
      key: accountKey(item, "asset"),
      name: item.name || item.account_type || item.type || "Account",
      value: Number(item.value) || 0,
      side: "asset" as const,
    })),
    ...(breakdown.debts ?? []).map((item) => ({
      key: accountKey(item, "debt"),
      name: item.name || item.account_type || item.type || "Debt",
      value: Number(item.value) || 0,
      side: "debt" as const,
    })),
  ];
}

function sumLinked(accounts: GoalAccount[], ids: string[]): number {
  const wanted = new Set(ids);
  return accounts.reduce((sum, account) => (wanted.has(account.key) ? sum + account.value : sum), 0);
}

export interface GoalMeasure {
  goalClass: GoalClass;
  bar: number | null;
  /** Amounts are dollars. The page formats them. */
  current: number | null;
  target: number | null;
  paidDown: number | null;
  remaining: number | null;
  loggedThisMonth: number;
  secondary: string;
}

export function measureGoal(
  goal: Pick<GoalRow, "name" | "goal_type" | "target_amount" | "current_amount" | "target_age" | "amount_unknown"> & {
    tracking_class?: string | null;
    linked_account_ids?: string[] | null;
  },
  latest: GoalAccount[],
  previous: GoalAccount[],
  loggedThisMonth: number,
): GoalMeasure {
  const goalClass = goalClassOf(goal);
  const links = goal.linked_account_ids ?? [];
  const loggedNote = loggedThisMonth > 0 ? "Includes what you logged toward it this month." : "";

  const empty = { current: null, target: null, paidDown: null, remaining: null, loggedThisMonth };

  if (goalClass === "note") {
    return {
      goalClass,
      bar: null,
      ...empty,
      secondary: "From your discovery conversation. Nothing here is measured until you give it an amount or an account.",
    };
  }

  if (goalClass === "retirement_age") {
    const attached = links.length > 0 ? sumLinked(latest, links) : null;
    return {
      goalClass,
      bar: null,
      ...empty,
      current: attached,
      secondary: attached == null
        ? "Attach the retirement accounts you want this to watch."
        : loggedNote || "Balance of the accounts you attached. This is not a projection.",
    };
  }

  if (goalClass === "retirement_income") {
    const attached = links.length > 0 ? sumLinked(latest, links) : null;
    return {
      goalClass,
      bar: null,
      ...empty,
      current: attached,
      target: goal.target_amount,
      secondary: "The income figure stays as you stated it. This does not project future income.",
    };
  }

  if (goalClass === "debt") {
    if (links.length === 0) {
      return {
        goalClass,
        bar: null,
        ...empty,
        secondary: "Attach the loan or mortgage from Net Worth. The drop in that balance is what this goal measures.",
      };
    }
    const now = sumLinked(latest, links);
    const before = sumLinked(previous, links);
    const paid = before > now ? before - now : 0;
    const bar = before > 0 ? Math.min(100, (paid / before) * 100) : null;
    return {
      goalClass,
      bar,
      ...empty,
      paidDown: paid,
      remaining: now,
      secondary: loggedNote || "Compared with the previous net-worth check-in.",
    };
  }

  const target = Number(goal.target_amount) || 0;
  const current = links.length > 0 ? sumLinked(latest, links) : Number(goal.current_amount) || 0;
  const bar = target > 0 ? Math.min(100, (current / target) * 100) : null;
  return {
    goalClass,
    bar,
    ...empty,
    current,
    target: target > 0 ? target : null,
    secondary: links.length > 0
      ? (loggedNote || "From the accounts you attached.")
      : "Link an account on Net Worth to measure this from your check-in.",
  };
}
