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

function finiteMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function breakdownItems(items: SnapshotBreakdownItem[] | null | undefined): SnapshotBreakdownItem[] {
  return (items ?? []).filter((item) => item != null && typeof item === "object");
}

export function accountsFromBreakdown(breakdown: SnapshotBreakdown | null | undefined): GoalAccount[] {
  if (!breakdown) return [];
  return [
    ...breakdownItems(breakdown.investments).map((item) => ({
      key: accountKey(item, "asset"),
      name: formatSnapshotLabel(item.name || item.account_type || item.type || "Account"),
      value: Number(item.value) || 0,
      side: "asset" as const,
      accountType: item.account_type,
      bucket: "investment" as const,
    })),
    ...breakdownItems(breakdown.fixed_assets).map((item) => ({
      key: accountKey(item, "asset"),
      name: formatSnapshotLabel(item.name || item.account_type || item.type || "Account"),
      value: Number(item.value) || 0,
      side: "asset" as const,
      accountType: item.account_type,
      bucket: "fixed" as const,
    })),
    ...breakdownItems(breakdown.debts).map((item) => ({
      key: accountKey(item, "debt"),
      name: formatSnapshotLabel(item.name || item.account_type || item.type || "Debt"),
      value: Number(item.value) || 0,
      side: "debt" as const,
      accountType: item.account_type,
      bucket: "debt" as const,
    })),
  ];
}

/** Debts on the profile, including a card whose balance is still zero. */
export function accountsFromDebts(rows: unknown): GoalAccount[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const debt = row as { type?: unknown; name?: unknown; balance?: unknown; amount?: unknown };
    const type = String(debt.type ?? debt.name ?? "").trim();
    const value = finiteMoney(debt.balance ?? debt.amount);
    if (!type || value == null) return [];
    return [
      {
        key: accountKey({ type, value }, "debt"),
        name: formatSnapshotLabel(type),
        value,
        side: "debt" as const,
        bucket: "debt" as const,
      },
    ];
  });
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
  const list = (accounts ?? []).filter((account) => account && account.key);
  if (goalClass === "cost_of_living" || goalClass === "note") return [];
  if (goalClass === "debt" || (trip && funding === "credit")) {
    return list.filter((account) => account.side === "debt");
  }
  if (trip && funding !== "set_aside" && funding !== "existing") return [];
  if (goalClass === "retirement_age" || goalClass === "retirement_income") {
    return list.filter((account) => account.side === "asset" && isRetirementAccount(account.accountType));
  }
  if (goalClass === "balance") {
    return list.filter((account) => account.side === "asset" && account.bucket !== "fixed");
  }
  return list.filter((account) => account.side === "asset");
}

/** Plan lines the goal sheet is allowed to offer. */
export function linesForGoal<T extends { slug: string; kind: "income" | "expense" | "savings" }>(
  goalClass: GoalClass,
  lines: T[],
  trip = false,
): T[] {
  if (trip || goalClass !== "balance" || !Array.isArray(lines)) return [];
  return lines.filter((line) => line && line.kind === "savings" && line.slug !== "debt_principal");
}

/** Last check-in strictly before a YYYY-MM month. */
export function snapshotBefore(history: DatedAccounts[] | null | undefined, month: string): DatedAccounts | null {
  if (!Array.isArray(history) || month.length < 7) return null;
  const start = `${month}-01`;
  const prior = history
    .filter((row) => typeof row?.date === "string" && row.date.slice(0, 10) < start)
    .sort((a, b) => a.date.localeCompare(b.date));
  return prior.length > 0 ? prior[prior.length - 1] : null;
}

/** Last check-in inside a YYYY-MM month. */
export function snapshotDuring(history: DatedAccounts[] | null | undefined, month: string): DatedAccounts | null {
  if (!Array.isArray(history) || month.length < 7) return null;
  const rows = history
    .filter((row) => typeof row?.date === "string" && row.date.slice(0, 7) === month)
    .sort((a, b) => a.date.localeCompare(b.date));
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

function sumKeys(accounts: GoalAccount[] | null | undefined, keys: string[]): number | null {
  if (!Array.isArray(accounts)) return null;
  const wanted = new Set(keys);
  const found = accounts.filter((account) => account && wanted.has(account.key));
  if (found.length === 0) return null;
  return found.reduce((sum, account) => sum + account.value, 0);
}

function debtTotal(accounts: GoalAccount[] | null | undefined): number {
  if (!Array.isArray(accounts)) return 0;
  return accounts.filter((account) => account && account.side === "debt").reduce((sum, account) => sum + account.value, 0);
}

/** The increase on a card in the trip month, and how much of that increase is still owed. */
export function cardPaydown(input: { before: number; added: number; now: number }): { increase: number; stillOwed: number } {
  const increase = Math.max(0, input.added - input.before);
  const stillOwed = Math.min(increase, Math.max(0, input.now - input.before));
  return { increase, stillOwed };
}

/** Live accounts that are not already on the latest check-in. */
export function mergeMissingAccounts(
  accounts: GoalAccount[] | null | undefined,
  live: GoalAccount[] | null | undefined,
): GoalAccount[] {
  const base = (accounts ?? []).filter((account) => account && account.key);
  const seen = new Set(base.map((account) => account.key));
  return [...base, ...(live ?? []).filter((account) => account && account.key && !seen.has(account.key))];
}

export interface DatedAccounts {
  date: string;
  accounts: GoalAccount[];
}

/** Debts on the check-in dated on or before the goal was created. The first check-in if none is earlier. */
export function startingDebts(history: DatedAccounts[] | null | undefined, goalCreatedAt: string | null | undefined): GoalAccount[] {
  if (!Array.isArray(history) || typeof goalCreatedAt !== "string" || goalCreatedAt.length < 10) return [];
  const created = goalCreatedAt.slice(0, 10);
  const sorted = history
    .filter((row) => typeof row?.date === "string")
    .sort((a, b) => a.date.localeCompare(b.date));
  const onOrBefore = sorted.filter((row) => row.date.slice(0, 10) <= created);
  const chosen = onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : sorted[0];
  if (!chosen || !Array.isArray(chosen.accounts)) return [];
  return chosen.accounts.filter((account) => account && account.side === "debt");
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

export const OMIT_HOME_MORTGAGE = "omit:home-mortgage";
export const OMIT_RENTAL_MORTGAGE = "omit:rental-mortgage";

export type DebtRole = "home_mortgage" | "rental_mortgage" | "student" | "car" | "card" | "other";

export function debtHasValue(start: number, now: number): boolean {
  return start > 0 || now > 0;
}

function isMortgageName(name: string): boolean {
  return /\bmortgage\b/i.test(name);
}

/** A mortgage tied to a rental when the name says so, or when the only property is a rental. Extra mortgages beside a residence are rentals. */
export function classifyDebtRoles(
  names: string[],
  flags: { hasPrimaryResidence?: boolean; hasRentalProperty?: boolean },
): DebtRole[] {
  const home = flags.hasPrimaryResidence === true;
  const rental = flags.hasRentalProperty === true;
  const roles: DebtRole[] = names.map((name) => {
    const text = name.toLowerCase();
    if (/student/.test(text)) return "student";
    if (/\b(car|auto|vehicle)\b/.test(text)) return "car";
    if (/credit card|\bvisa\b|\bmastercard\b|\bamex\b|american express/.test(text)) return "card";
    return "other";
  });
  const mortgageIndexes = names.flatMap((name, index) => (isMortgageName(name) ? [index] : []));
  const rentalNamed = mortgageIndexes.filter((index) => /rental|investment property/.test(names[index].toLowerCase()));
  const plain = mortgageIndexes.filter((index) => !rentalNamed.includes(index));
  for (const index of rentalNamed) roles[index] = "rental_mortgage";
  if (!home && rental) {
    for (const index of plain) roles[index] = "rental_mortgage";
  } else if (home && rental && plain.length > 1) {
    roles[plain[0]] = "home_mortgage";
    for (const index of plain.slice(1)) roles[index] = "rental_mortgage";
  } else {
    for (const index of plain) roles[index] = "home_mortgage";
  }
  return roles;
}

function singleDebtTitle(role: DebtRole, names: string[]): string {
  if (role === "student") return "Pay off Student Loan(s)";
  if (role === "car") return "Pay off Car loan";
  if (role === "card") return "Pay off Credit card";
  if (role === "other" && names.length === 1) return `Pay off ${names[0]}`;
  return "Pay off Consumer debt";
}

/** Title for the debts included in the goal. A residence mortgage makes it all debt. Leaving that mortgage out makes the rest consumer debt. */
export function debtGoalTitle(
  rows: { name: string; role: DebtRole }[],
  options?: { homeMortgageExcluded?: boolean },
): string {
  const roles = [...new Set(rows.map((row) => row.role))];
  if (roles.includes("home_mortgage")) return "All Debt";
  const rest = roles.filter((role) => role !== "rental_mortgage");
  const hasRental = roles.includes("rental_mortgage");
  if (options?.homeMortgageExcluded && rows.length > 0) {
    if (rest.length === 1 && rest[0] === "student" && !hasRental) return "Pay off Student Loan(s)";
    if (hasRental && rest.length === 0) return "Pay off Rental mortgage";
    if (hasRental) return "Pay off Consumer debt and rental mortgage";
    return "Pay off Consumer debt";
  }
  if (hasRental && rest.length === 0) return "Pay off Rental mortgage";
  if (hasRental && rest.length === 1) {
    const names = rows.filter((row) => row.role === rest[0]).map((row) => row.name);
    return `${singleDebtTitle(rest[0], names)} and rental mortgage`;
  }
  if (hasRental) return "Pay off Consumer debt and rental mortgage";
  if (rest.length === 1) {
    const names = [...new Set(rows.filter((row) => row.role === rest[0]).map((row) => row.name))];
    return singleDebtTitle(rest[0], names);
  }
  if (rest.length > 1) return "Pay off Consumer debt";
  return "Pay off debt";
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
  /** A primary residence is on Net Worth. Used to tell a home mortgage from a rental mortgage. */
  hasPrimaryResidence?: boolean;
  /** A real-estate asset other than the primary residence. */
  hasRentalProperty?: boolean;
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
      title: string;
      showHomeMortgage: boolean;
      showRentalMortgage: boolean;
      includeHome: boolean;
      includeRental: boolean;
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
  const links = Array.isArray(goal.linked_account_ids) ? goal.linked_account_ids : [];
  const planLinks = Array.isArray(goal.linked_plan_categories) ? goal.linked_plan_categories : [];
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
    const valued = keys
      .map((key) => ({
        key,
        name: names.get(key) ?? "Debt",
        start: startMap.get(key) ?? 0,
        now: nowMap.get(key)?.value ?? 0,
      }))
      .filter((row) => debtHasValue(row.start, row.now));
    const roles = classifyDebtRoles(valued.map((row) => row.name), facts);
    const tagged = valued.map((row, index) => ({ ...row, role: roles[index] }));
    const includeHome = !links.includes(OMIT_HOME_MORTGAGE);
    const includeRental = !links.includes(OMIT_RENTAL_MORTGAGE);
    const rows = tagged.filter((row) => {
      if (row.role === "home_mortgage" && !includeHome) return false;
      if (row.role === "rental_mortgage" && !includeRental) return false;
      return true;
    });
    const paidDown = rows.reduce((sum, row) => sum + Math.max(0, row.start - row.now), 0);
    const stillOwed = rows.reduce((sum, row) => sum + row.now, 0);
    const startTotal = rows.reduce((sum, row) => sum + row.start, 0);
    const atStart = startTotal > 0 && rows.every((row) => row.now === row.start);
    const bar = startTotal > 0 && !atStart ? Math.min(100, (paidDown / startTotal) * 100) : null;
    return {
      goalClass,
      bar,
      rows,
      paidDown,
      stillOwed,
      hasDebts: rows.length > 0,
      atStart,
      title: debtGoalTitle(rows, { homeMortgageExcluded: tagged.some((row) => row.role === "home_mortgage") && !includeHome }),
      showHomeMortgage: tagged.some((row) => row.role === "home_mortgage"),
      showRentalMortgage: tagged.some((row) => row.role === "rental_mortgage"),
      includeHome,
      includeRental,
    };
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
