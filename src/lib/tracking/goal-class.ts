import type { GoalRow, SnapshotBreakdown, SnapshotBreakdownItem } from "@/types/tracking";
import { addDays, startOfWeekMonday } from "@/lib/tracking/dates";
import { formatSnapshotLabel } from "@/lib/net-worth/tracking";

export const GOAL_CLASSES = [
  "balance",
  "debt",
  "retirement_age",
  "retirement_income",
  "cost_of_living",
  "note",
] as const;
export type GoalClass = (typeof GOAL_CLASSES)[number];

export const GOAL_CLASS_LABELS: Record<GoalClass, string> = {
  balance: "Save toward an amount",
  debt: "Pay off a debt",
  retirement_age: "Retire at an age",
  retirement_income: "Retirement income",
  cost_of_living: "Cost of living",
  note: "Other goal",
};

/** Statistics Canada life expectancy at birth, rounded. A general figure, not a personal forecast. */
export const CANADA_LIFE_EXPECTANCY_YEARS = 82;

const RETIREMENT_ACCOUNT_TYPES = new Set([
  "rrsp",
  "tfsa",
  "rrif",
  "lira",
  "lrsp",
  "rlsp",
  "lif",
  "lrif",
  "prif",
  "rlif",
  "dc-rpp",
  "hybrid-rpp",
  "target-benefit",
  "group-rrsp",
  "group-tfsa",
  "dpsp",
  "prpp",
  "vrsp",
  "spp",
]);

export const FUNDING_METHODS = ["set_aside", "existing", "cash_flow", "credit"] as const;
export type FundingMethod = (typeof FUNDING_METHODS)[number];

export interface GoalAccount {
  key: string;
  name: string;
  value: number;
  side: "asset" | "debt";
  accountType?: string;
  /** Investment accounts can be linked from a goal. Fixed assets stay on Net Worth only. */
  bucket?: "investment" | "fixed" | "debt";
}

export function isRetirementAccount(accountType: string | null | undefined): boolean {
  return RETIREMENT_ACCOUNT_TYPES.has(String(accountType ?? "").trim().toLowerCase());
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

  if (/maintain|cost of living|lifestyle/.test(name)) return "cost_of_living";

  const generic =
    /not sure/.test(name) || (input.amountUnknown && (type === "other" || type === ""));
  if (generic) return "note";
  return "balance";
}

export function goalClassOf(
  goal: Pick<GoalRow, "name" | "goal_type" | "amount_unknown" | "target_amount" | "target_age"> & {
    tracking_class?: string | null;
  },
): GoalClass {
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
  return [
    ...(breakdown.investments ?? []).map((item) => ({
      key: accountKey(item, "asset"),
      name: formatSnapshotLabel(item.name || item.account_type || item.type || "Account"),
      value: Number(item.value) || 0,
      side: "asset" as const,
      accountType: item.account_type,
      bucket: "investment" as const,
    })),
    ...(breakdown.fixed_assets ?? []).map((item) => ({
      key: accountKey(item, "asset"),
      name: formatSnapshotLabel(item.name || item.account_type || item.type || "Account"),
      value: Number(item.value) || 0,
      side: "asset" as const,
      accountType: item.account_type,
      bucket: "fixed" as const,
    })),
    ...(breakdown.debts ?? []).map((item) => ({
      key: accountKey(item, "debt"),
      name: formatSnapshotLabel(item.name || item.account_type || item.type || "Debt"),
      value: Number(item.value) || 0,
      side: "debt" as const,
      accountType: item.account_type,
      bucket: "debt" as const,
    })),
  ];
}

/** A vacation, or a goal whose name is a trip. */
export function isTripGoal(input: { name?: string | null; goal_type?: string | null }): boolean {
  if ((input.goal_type ?? "").toLowerCase() === "vacation") return true;
  return /\b(travel|vacation|holiday|trip)\b/i.test(input.name ?? "");
}

export function fundingMethodOf(value: string | null | undefined): FundingMethod | null {
  if (value && (FUNDING_METHODS as readonly string[]).includes(value)) return value as FundingMethod;
  return null;
}

/** Accounts the goal sheet is allowed to offer. */
export function accountsForGoal(
  goalClass: GoalClass,
  accounts: GoalAccount[],
  options?: { trip?: boolean; funding?: FundingMethod | null },
): GoalAccount[] {
  const trip = options?.trip === true;
  const funding = options?.funding ?? null;
  if (goalClass === "cost_of_living" || goalClass === "note") return [];
  if (goalClass === "debt" || (trip && funding === "credit")) {
    return accounts.filter((account) => account.side === "debt");
  }
  if (trip && funding !== "set_aside" && funding !== "existing") return [];
  if (goalClass === "retirement_age" || goalClass === "retirement_income") {
    return accounts.filter((account) => account.side === "asset" && isRetirementAccount(account.accountType));
  }
  if (goalClass === "balance") {
    return accounts.filter((account) => account.side === "asset" && account.bucket !== "fixed");
  }
  return accounts.filter((account) => account.side === "asset");
}

/** Plan lines the goal sheet is allowed to offer. */
export function linesForGoal<T extends { slug: string; kind: "income" | "expense" | "savings" }>(
  goalClass: GoalClass,
  lines: T[],
  trip = false,
): T[] {
  if (trip || goalClass !== "balance") return [];
  return lines.filter((line) => line.kind === "savings" && line.slug !== "debt_principal");
}

/** Last check-in strictly before a YYYY-MM month. */
export function snapshotBefore(history: DatedAccounts[], month: string): DatedAccounts | null {
  const start = `${month}-01`;
  const prior = history.filter((row) => row.date.slice(0, 10) < start).sort((a, b) => a.date.localeCompare(b.date));
  return prior.length > 0 ? prior[prior.length - 1] : null;
}

/** Last check-in inside a YYYY-MM month. */
export function snapshotDuring(history: DatedAccounts[], month: string): DatedAccounts | null {
  const rows = history.filter((row) => row.date.slice(0, 7) === month).sort((a, b) => a.date.localeCompare(b.date));
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

function sumKeys(accounts: GoalAccount[], keys: string[]): number | null {
  const wanted = new Set(keys);
  const found = accounts.filter((account) => wanted.has(account.key));
  if (found.length === 0) return null;
  return found.reduce((sum, account) => sum + account.value, 0);
}

function debtTotal(accounts: GoalAccount[]): number {
  return accounts.filter((account) => account.side === "debt").reduce((sum, account) => sum + account.value, 0);
}

/** The increase on a card in the trip month, and how much of that increase is still owed. */
export function cardPaydown(input: { before: number; added: number; now: number }): { increase: number; stillOwed: number } {
  const increase = Math.max(0, input.added - input.before);
  const stillOwed = Math.min(increase, Math.max(0, input.now - input.before));
  return { increase, stillOwed };
}

/** Live accounts that are not already on the latest check-in. */
export function mergeMissingAccounts(accounts: GoalAccount[], live: GoalAccount[]): GoalAccount[] {
  const seen = new Set(accounts.map((account) => account.key));
  return [...accounts, ...live.filter((account) => !seen.has(account.key))];
}

export interface DatedAccounts {
  date: string;
  accounts: GoalAccount[];
}

/** Debts on the check-in dated on or before the goal was created. The first check-in if none is earlier. */
export function startingDebts(history: DatedAccounts[], goalCreatedAt: string): GoalAccount[] {
  const created = goalCreatedAt.slice(0, 10);
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const onOrBefore = sorted.filter((row) => row.date.slice(0, 10) <= created);
  const chosen = onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : sorted[0];
  if (!chosen) return [];
  return chosen.accounts.filter((account) => account.side === "debt");
}

/** How many of the last `window` weeks, including this one, have a spending date. */
export function monthShare(today: string): { day: number; days: number; complete: boolean } {
  const [year, month, day] = today.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Number.isFinite(day) && day > 0 ? day : 1;
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  return { day: Math.min(safeDay, safeDays), days: safeDays, complete: safeDay >= safeDays };
}

export function weeksWithSpending(dates: string[], today: string, window = 4): number {
  const weeks = new Set(dates.map((date) => startOfWeekMonday(date)));
  const start = startOfWeekMonday(today);
  let count = 0;
  for (let i = 0; i < window; i += 1) {
    if (weeks.has(addDays(start, -7 * i))) count += 1;
  }
  return count;
}

function sumLinked(accounts: GoalAccount[], ids: string[]): number {
  const wanted = new Set(ids);
  return accounts.reduce((sum, account) => (wanted.has(account.key) ? sum + account.value : sum), 0);
}

function retirementBalance(latest: GoalAccount[], linkedIds: string[]): number | null {
  if (linkedIds.length > 0) return sumLinked(latest, linkedIds);
  const retirement = latest.filter((account) => account.side === "asset" && isRetirementAccount(account.accountType));
  if (retirement.length === 0) return null;
  return retirement.reduce((sum, account) => sum + account.value, 0);
}

export interface DebtRow {
  key: string;
  name: string;
  start: number;
  now: number;
}

export interface GoalFacts {
  today: string;
  age: number | null;
  /** Plan spending this month, otherwise the monthly expenses on the profile. */
  exampleMonthly: number | null;
  /** Expense rows on the plan for this month. Null when the plan has none. */
  planExpense: number | null;
  monthExpense: number;
  expenseDates: string[];
  latest: GoalAccount[];
  /** Check-ins, oldest or newest. Trip goals read the month around the trip. */
  history: DatedAccounts[];
  /** Debts on the check-in when the goal began. Ignored once the goal has a saved baseline. */
  startDebts: GoalAccount[];
  loggedByCategory: Record<string, number>;
  /** Expense totals keyed by `YYYY-MM:category`. */
  spendByMonthCategory: Record<string, number>;
}

type GoalInput = Pick<
  GoalRow,
  "name" | "goal_type" | "target_amount" | "current_amount" | "target_age" | "amount_unknown"
> & {
  tracking_class?: string | null;
  linked_account_ids?: string[] | null;
  linked_plan_categories?: string[] | null;
  baseline_balances?: Record<string, number> | null;
  monthly_need?: number | null;
  funding_method?: string | null;
  payoff_months?: number | null;
  target_date?: string | null;
  created_at?: string;
};

export type GoalReading =
  | {
      goalClass: "retirement_age";
      bar: null;
      yearsUntil: number | null;
      yearsInRetirement: number | null;
      lifeExpectancy: number;
      monthlyNeed: number | null;
      exampleMonthly: number | null;
      exampleFromPlan: boolean;
      spendingTotal: number | null;
      balance: number | null;
      gap: number | null;
      needsAge: boolean;
      needsSpend: boolean;
    }
  | {
      goalClass: "retirement_income";
      bar: null;
      annual: number | null;
      balance: number | null;
    }
  | {
      goalClass: "debt";
      bar: number | null;
      rows: DebtRow[];
      paidDown: number;
      stillOwed: number;
      hasDebts: boolean;
      atStart: boolean;
    }
  | {
      goalClass: "balance";
      bar: number | null;
      current: number | null;
      target: number | null;
      loggedThisMonth: number;
      needsAccount: boolean;
      needsPlanLine: boolean;
      trip: boolean;
      fundingMethod: FundingMethod | null;
      needsFunding: boolean;
      tripMonth: string | null;
      beforeTrip: boolean;
      tripSpend: number | null;
      creditChange: number | null;
      payoffMonths: number | null;
      cardIncrease: number | null;
      cardStillOwed: number | null;
    }
  | {
      goalClass: "cost_of_living";
      bar: null;
      weeksLogged: number;
      weekWindow: number;
      tracked: number;
      budget: number | null;
      budgetSource: "plan" | "entered" | null;
      /** True on the last day, when the comparison is against the full month. */
      monthComplete: boolean;
      exampleMonthly: number | null;
      exampleFromPlan: boolean;
    }
  | {
      goalClass: "note";
      bar: number | null;
      current: number | null;
      target: number | null;
      loggedThisMonth: number;
      needsDetail: boolean;
    };

export function readGoal(goal: GoalInput, facts: GoalFacts): GoalReading {
  const goalClass = goalClassOf(goal);
  const links = goal.linked_account_ids ?? [];
  const planLinks = goal.linked_plan_categories ?? [];
  const loggedThisMonth = planLinks.reduce((sum, slug) => sum + (facts.loggedByCategory[slug] ?? 0), 0);

  if (goalClass === "retirement_age") {
    const targetAge = goal.target_age;
    const yearsUntil = facts.age != null && targetAge != null ? targetAge - facts.age : null;
    const yearsInRetirement = targetAge != null ? Math.max(0, CANADA_LIFE_EXPECTANCY_YEARS - targetAge) : null;
    const monthlyNeed = goal.monthly_need != null && goal.monthly_need > 0 ? goal.monthly_need : null;
    const spendingTotal =
      monthlyNeed != null && yearsInRetirement != null ? monthlyNeed * 12 * yearsInRetirement : null;
    const balance = retirementBalance(facts.latest, links);
    const gap = spendingTotal != null && balance != null ? spendingTotal - balance : null;
    return {
      goalClass,
      bar: null,
      yearsUntil,
      yearsInRetirement,
      lifeExpectancy: CANADA_LIFE_EXPECTANCY_YEARS,
      monthlyNeed,
      exampleMonthly: facts.exampleMonthly,
      exampleFromPlan: facts.planExpense != null && facts.planExpense > 0,
      spendingTotal,
      balance,
      gap,
      needsAge: facts.age == null,
      needsSpend: monthlyNeed == null,
    };
  }

  if (goalClass === "retirement_income") {
    return {
      goalClass,
      bar: null,
      annual: goal.target_amount,
      balance: links.length > 0 ? sumLinked(facts.latest, links) : retirementBalance(facts.latest, []),
    };
  }

  if (goalClass === "debt") {
    const saved = goal.baseline_balances ?? {};
    const useSaved = Object.keys(saved).length > 0;
    const startMap = new Map(
      useSaved ? Object.entries(saved) : facts.startDebts.map((account) => [account.key, account.value] as const),
    );
    const nowList = facts.latest.filter((account) => account.side === "debt");
    const nowMap = new Map(nowList.map((account) => [account.key, account]));
    const names = new Map<string, string>();
    for (const account of facts.startDebts) names.set(account.key, account.name);
    for (const account of nowList) names.set(account.key, account.name);
    const keys = [...new Set([...startMap.keys(), ...nowMap.keys()])];
    const rows: DebtRow[] = keys.map((key) => ({
      key,
      name: names.get(key) ?? "Debt",
      start: startMap.get(key) ?? 0,
      now: nowMap.get(key)?.value ?? 0,
    }));
    const paidDown = rows.reduce((sum, row) => sum + Math.max(0, row.start - row.now), 0);
    const stillOwed = rows.reduce((sum, row) => sum + row.now, 0);
    const startTotal = rows.reduce((sum, row) => sum + row.start, 0);
    const atStart = startTotal > 0 && rows.every((row) => row.now === row.start);
    const bar = startTotal > 0 && !atStart ? Math.min(100, (paidDown / startTotal) * 100) : null;
    return { goalClass, bar, rows, paidDown, stillOwed, hasDebts: rows.length > 0, atStart };
  }

  if (goalClass === "cost_of_living") {
    const plan = facts.planExpense != null && facts.planExpense > 0 ? facts.planExpense : null;
    const entered = goal.monthly_need != null && goal.monthly_need > 0 ? goal.monthly_need : null;
    const share = monthShare(facts.today);
    return {
      goalClass,
      bar: null,
      weeksLogged: weeksWithSpending(facts.expenseDates, facts.today, 4),
      weekWindow: 4,
      tracked: facts.monthExpense,
      budget: plan ?? entered,
      budgetSource: plan != null ? "plan" : entered != null ? "entered" : null,
      exampleMonthly: facts.exampleMonthly,
      exampleFromPlan: plan != null,
      monthComplete: share.complete,
    };
  }

  if (goalClass === "note") {
    const target = Number(goal.target_amount) || 0;
    const current = links.length > 0 ? sumLinked(facts.latest, links) : null;
    const bar = target > 0 && current != null ? Math.min(100, (current / target) * 100) : null;
    return {
      goalClass,
      bar,
      current,
      target: target > 0 ? target : null,
      loggedThisMonth,
      needsDetail: links.length === 0 && target <= 0,
    };
  }

  const trip = isTripGoal(goal);
  const method = trip ? fundingMethodOf(goal.funding_method) : null;
  const tripMonth = trip && goal.target_date ? goal.target_date.slice(0, 7) : null;
  const beforeTrip = tripMonth != null && facts.today.slice(0, 7) < tripMonth;
  const tripSpend =
    tripMonth != null && !beforeTrip ? (facts.spendByMonthCategory[`${tripMonth}:travel`] ?? 0) : null;
  const prior = tripMonth ? snapshotBefore(facts.history, tripMonth) : null;
  const during = tripMonth ? snapshotDuring(facts.history, tripMonth) : null;
  const creditChange =
    method === "cash_flow" && !beforeTrip && prior != null
      ? debtTotal(facts.latest) - debtTotal(prior.accounts)
      : null;
  let cardIncrease: number | null = null;
  let cardStillOwed: number | null = null;
  if (method === "credit" && !beforeTrip && prior && during && links.length > 0) {
    const before = sumKeys(prior.accounts, links);
    const added = sumKeys(during.accounts, links);
    const now = sumKeys(facts.latest, links);
    if (before != null && added != null && now != null) {
      const paydown = cardPaydown({ before, added, now });
      cardIncrease = paydown.increase;
      cardStillOwed = paydown.stillOwed;
    }
  }
  const watchesBalance = !trip || method == null || method === "set_aside" || method === "existing";
  const target = Number(goal.target_amount) || 0;
  const current = watchesBalance && links.length > 0 ? sumLinked(facts.latest, links) : null;
  const bar = watchesBalance && target > 0 && current != null ? Math.min(100, (current / target) * 100) : null;
  const asksForAccount = method == null || method === "set_aside" || method === "existing";
  return {
    goalClass: "balance",
    bar,
    current,
    target: target > 0 ? target : null,
    loggedThisMonth,
    needsAccount: trip ? asksForAccount && links.length === 0 : links.length === 0,
    needsPlanLine: trip ? false : planLinks.length === 0,
    trip,
    fundingMethod: method,
    needsFunding: trip && method == null,
    tripMonth,
    beforeTrip,
    tripSpend,
    creditChange,
    payoffMonths: method === "credit" && goal.payoff_months != null ? goal.payoff_months : null,
    cardIncrease,
    cardStillOwed,
  };
}
