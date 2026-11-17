import {
  createDemoTimeline,
  type DemoBaseState,
  type DemoKeyframe,
  type DemoStep,
} from "@/lib/marketing/demo-timeline";
import {
  monthPeriod,
  savingsRate,
  trackedTotals,
  trackingBalance,
  varianceSections,
  type CategoryVariance,
  type SavingsRateMode,
} from "@/lib/tracking/budget-kpis";
import type { CashTxn } from "@/lib/tracking/cash-capture";
import type { BudgetPlanEntry } from "@/types/tracking";

/**
 * The Cash Flow Review demo: one fully tracked month against its plan.
 *
 * The lines below are made up. Every number on screen comes from running them
 * through the same functions the Review page uses, so the tiles and the table
 * always agree with each other.
 *
 * Compliance: an illustration of tracking, never a target, a forecast, or a
 * result. Nothing here mentions returns or what a person should do.
 */

/** Only used to group the lines into one month. Never shown. */
const MONTH = "2026-01-01";

type DemoTxn = CashTxn & { category: string };

function spend(day: number, category: string, amount: number): DemoTxn {
  return { txn_date: dayOf(day), amount, direction: "out", line_role: "purchase", category };
}

function dayOf(day: number): string {
  return `${MONTH.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

const TXNS: DemoTxn[] = [
  { txn_date: dayOf(2), amount: 2_450, direction: "in", line_role: "income", category: "paycheque" },
  { txn_date: dayOf(16), amount: 2_450, direction: "in", line_role: "income", category: "paycheque" },
  spend(1, "housing", 1_850),
  ...[150, 130, 140, 140].map((amount, week) => spend(4 + week * 7, "groceries", amount)),
  ...[80, 70, 85, 75].map((amount, week) => spend(5 + week * 7, "transportation", amount)),
  ...[60, 55, 70, 55].map((amount, week) => spend(6 + week * 7, "dining", amount)),
  { txn_date: dayOf(2), amount: 700, direction: "out", line_role: "savings", category: "tfsa" },
  { txn_date: dayOf(16), amount: 300, direction: "out", line_role: "savings", category: "debt_principal" },
];

const PLAN: BudgetPlanEntry[] = [
  { kind: "income", category: "paycheque", month: MONTH, amount: 4_900 },
  { kind: "expense", category: "housing", month: MONTH, amount: 1_850 },
  { kind: "expense", category: "groceries", month: MONTH, amount: 600 },
  { kind: "expense", category: "transportation", month: MONTH, amount: 350 },
  { kind: "expense", category: "dining", month: MONTH, amount: 200 },
  { kind: "savings", category: "tfsa", month: MONTH, amount: 700 },
  { kind: "savings", category: "debt_principal", month: MONTH, amount: 300 },
];

const PERIOD = monthPeriod(MONTH);
const TOTALS = trackedTotals(TXNS, PERIOD);
const SECTIONS = varianceSections(TXNS, PLAN, PERIOD);

function sectionOf(kind: "income" | "expense" | "savings") {
  const section = SECTIONS.find((item) => item.kind === kind);
  if (!section) throw new Error(`Review demo has no ${kind} section.`);
  return section;
}

/** What the Review page would show for the made-up month. */
export const REVIEW_DEMO = {
  totals: TOTALS,
  balance: trackingBalance(TOTALS),
  rate: {
    active: savingsRate(TOTALS, "active"),
    passive: savingsRate(TOTALS, "passive"),
  } satisfies Record<SavingsRateMode, number | null>,
  income: sectionOf("income"),
  expenses: sectionOf("expense"),
  savings: sectionOf("savings"),
} as const;

/** Tracked amount for one savings line. The net worth demo builds on these. */
export function reviewDemoSaved(category: string): number {
  const row = REVIEW_DEMO.savings.rows.find((item: CategoryVariance) => item.category === category);
  if (!row) throw new Error(`Review demo has no savings line for ${category}.`);
  return row.tracked;
}

export const REVIEW_DEMO_TILES = 3;

export interface ReviewDemoFrame extends DemoBaseState {
  /** How many of the three KPI tiles have filled in. */
  tiles: number;
  /** How many expense rows have filled in. */
  rows: number;
  /** True once the row that ran past its budget is called out. */
  flagged: boolean;
  /** The savings-rate toggle being tapped. */
  pressed: SavingsRateMode | null;
  rateMode: SavingsRateMode;
}

const INITIAL: ReviewDemoFrame = {
  step: 0,
  resetting: false,
  tiles: 0,
  rows: 0,
  flagged: false,
  pressed: null,
  rateMode: "active",
};

type Keyframe = DemoKeyframe<ReviewDemoFrame>;

const TILE_REVEALS: Keyframe[] = Array.from({ length: REVIEW_DEMO_TILES }, (_, index) => ({
  at: 900 + index * 600,
  set: { tiles: index + 1 },
}));

const ROW_REVEALS: Keyframe[] = REVIEW_DEMO.expenses.rows.map((_, index) => ({
  at: 4_000 + index * 500,
  set: { rows: index + 1 },
}));

const SCRIPT: Keyframe[] = [
  // 1. The month: tracked, balance, savings rate.
  ...TILE_REVEALS,
  // 2. Each category against its budget.
  { at: 3_500, set: { step: 1 } },
  ...ROW_REVEALS,
  { at: 6_400, set: { flagged: true } },
  // 3. The savings rate, read two ways.
  { at: 8_000, set: { step: 2 } },
  { at: 8_600, set: { pressed: "passive" } },
  { at: 8_900, set: { pressed: null, rateMode: "passive" } },
  { at: 10_800, set: { pressed: "active" } },
  { at: 11_100, set: { pressed: null, rateMode: "active" } },
];

export const REVIEW_DEMO_TIMELINE = createDemoTimeline<ReviewDemoFrame>({
  initial: INITIAL,
  keyframes: SCRIPT,
});

export const REVIEW_DEMO_STEPS: readonly DemoStep[] = [
  { label: "Review the month", detail: "against your plan" },
  { label: "Check each category", detail: "used or over" },
  { label: "Savings rate", detail: "saved or not spent" },
];

export const REVIEW_DEMO_ALT =
  "Illustration of the monthly Review in Mosaic: the month shows as fully tracked with a tracking balance and a savings rate, then each spending category is compared with its budget, and the savings rate is shown two ways.";

export const REVIEW_DEMO_NOTE = "Illustration. Made-up numbers, not a target or a forecast.";
