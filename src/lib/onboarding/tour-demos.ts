/**
 * Animated examples inside the tour. The amounts are made up. Every total on
 * screen comes from the same functions the trackers use.
 */
import { createDemoTimeline, type DemoBaseState, type DemoStep } from "@/lib/marketing/demo-timeline";
import { snapshotGroups } from "@/lib/net-worth/tracking";
import { planTotals } from "@/lib/tracking/budget-plan";
import type { BudgetPlanEntry } from "@/types/tracking";

const MONTHS = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"] as const;
export const TOUR_PLAN_MONTHS = ["Jan", "Feb", "Mar", "Apr"] as const;
const PAYCHEQUE = 8233;
const EDITED = 9000;
const GROCERIES = 400;

export const TOUR_PLAN_NOTE = "Example amounts. The totals use the plan maths.";

interface PlanState extends DemoBaseState {
  edited: boolean;
  filled: boolean;
  added: boolean;
}

function planEntries(state: PlanState): BudgetPlanEntry[] {
  const entries: BudgetPlanEntry[] = MONTHS.map((month, index) => ({
    kind: "income",
    category: "paycheque",
    month,
    amount: state.edited && (state.filled || index === 0) ? EDITED : PAYCHEQUE,
  }));
  if (state.added) {
    for (const month of MONTHS) {
      entries.push({ kind: "expense", category: "groceries", month, amount: GROCERIES });
    }
  }
  return entries;
}

export interface PlanDemoFrame extends DemoBaseState {
  months: number[];
  groceries: number | null;
  income: number;
  expense: number;
  left: number;
}

export const PLAN_DEMO_TIMELINE = createDemoTimeline<PlanState, PlanDemoFrame>({
  initial: { step: 0, resetting: false, edited: false, filled: false, added: false },
  keyframes: [
    { at: 2_200, set: { edited: true, step: 1 } },
    { at: 5_400, set: { filled: true, step: 1 } },
    { at: 8_600, set: { added: true, step: 2 } },
  ],
  derive(state) {
    const entries = planEntries(state);
    const totals = planTotals(entries);
    return {
      step: state.step,
      resetting: state.resetting,
      months: entries.filter((entry) => entry.kind === "income").map((entry) => entry.amount),
      groceries: state.added ? GROCERIES : null,
      income: totals.income,
      expense: totals.expense,
      left: totals.toBeAllocated,
    };
  },
});

export const PLAN_DEMO_STEPS: readonly DemoStep[] = [
  { label: "The plan", detail: "one amount on each month" },
  { label: "Edit, then fill", detail: "the rest of the year follows" },
  { label: "Add a line", detail: "as many as you track" },
];

export const TOUR_LOG_BUDGET = 400;
export const TOUR_LOG_ALREADY = 120;
export const TOUR_LOG_SPEND = 42.5;
export const TOUR_LOG_NOTE = "Example amounts. The bar is spent divided by the category budget.";

interface LogState extends DemoBaseState {
  typed: boolean;
  chosen: boolean;
  logged: boolean;
}

export interface LogDemoFrame extends DemoBaseState {
  amount: string;
  chosen: boolean;
  spent: number;
  left: number;
  bar: number;
}

function loggedSpend(logged: boolean): number {
  return TOUR_LOG_ALREADY + (logged ? TOUR_LOG_SPEND : 0);
}

export const LOG_DEMO_TIMELINE = createDemoTimeline<LogState, LogDemoFrame>({
  initial: { step: 0, resetting: false, typed: false, chosen: false, logged: false },
  keyframes: [
    { at: 2_400, set: { typed: true, step: 0 } },
    { at: 5_200, set: { chosen: true, step: 1 } },
    { at: 8_000, set: { logged: true, step: 2 } },
  ],
  derive(state) {
    const spent = Math.round(loggedSpend(state.logged) * 100) / 100;
    return {
      step: state.step,
      resetting: state.resetting,
      amount: state.typed ? "42.50" : "0",
      chosen: state.chosen,
      spent,
      left: Math.round((TOUR_LOG_BUDGET - spent) * 100) / 100,
      bar: Math.min(100, (spent / TOUR_LOG_BUDGET) * 100),
    };
  },
});

export const LOG_DEMO_STEPS: readonly DemoStep[] = [
  { label: "Enter the amount", detail: "then tap a category" },
  { label: "Groceries", detail: "the purchase leaves the bank" },
  { label: "Against the plan", detail: "the month moves" },
];

const BEFORE = { investments_total: 120_000, fixed_assets_total: 430_000, debts_total: 250_000, net_worth: 0 };
export const TOUR_SAVE = 416;
export const TOUR_PAYDOWN = 200;

function groupsFor(investments: number, debts: number) {
  return snapshotGroups({
    ...BEFORE,
    investments_total: investments,
    debts_total: debts,
  });
}

export const CHECK_IN_BEFORE = groupsFor(BEFORE.investments_total, BEFORE.debts_total);
export const CHECK_IN_AFTER = groupsFor(BEFORE.investments_total + TOUR_SAVE, BEFORE.debts_total - TOUR_PAYDOWN);

interface CheckInState extends DemoBaseState {
  saved: boolean;
}

export interface CheckInDemoFrame extends DemoBaseState {
  netWorth: number;
  assets: number;
  debts: number;
  points: number;
}

export const CHECK_IN_DEMO_TIMELINE = createDemoTimeline<CheckInState, CheckInDemoFrame>({
  initial: { step: 0, resetting: false, saved: false },
  keyframes: [
    { at: 3_200, set: { step: 1 } },
    { at: 7_200, set: { saved: true, step: 2 } },
  ],
  derive(state) {
    const groups = state.saved ? CHECK_IN_AFTER : CHECK_IN_BEFORE;
    return {
      step: state.step,
      resetting: state.resetting,
      netWorth: groups.netWorth,
      assets: groups.assets,
      debts: groups.liabilities,
      points: state.saved ? 4 : 3,
    };
  },
});

export const CHECK_IN_DEMO_STEPS: readonly DemoStep[] = [
  { label: "This month", detail: "accounts, property, and debts" },
  { label: "Save the snapshot", detail: "once a month" },
  { label: "The history", detail: "gains a point" },
];

export const CHECK_IN_NOTE = "Example amounts. Net worth is assets minus debts, from the snapshot maths.";

interface TogetherState extends DemoBaseState {
  carried: boolean;
}

export interface TogetherDemoFrame extends DemoBaseState {
  savings: number;
  paydown: number;
  netWorth: number;
  assets: number;
  debts: number;
}

export const TOGETHER_DEMO_TIMELINE = createDemoTimeline<TogetherState, TogetherDemoFrame>({
  initial: { step: 0, resetting: false, carried: false },
  keyframes: [
    { at: 4_200, set: { step: 1 } },
    { at: 8_200, set: { carried: true, step: 2 } },
  ],
  derive(state) {
    const groups = state.carried ? CHECK_IN_AFTER : CHECK_IN_BEFORE;
    return {
      step: state.step,
      resetting: state.resetting,
      savings: TOUR_SAVE,
      paydown: TOUR_PAYDOWN,
      netWorth: groups.netWorth,
      assets: groups.assets,
      debts: groups.liabilities,
    };
  },
});

export const TOGETHER_DEMO_STEPS: readonly DemoStep[] = [
  { label: "Cash Flow", detail: "set aside, and pay down" },
  { label: "The next check-in", detail: "reads those balances" },
  { label: "Net worth", detail: "moves by that much" },
];

export const TOGETHER_NOTE = "Example amounts. The next check-in uses the snapshot maths, with no market movement.";
