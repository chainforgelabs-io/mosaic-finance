import {
  createDemoTimeline,
  type DemoBaseState,
  type DemoKeyframe,
  type DemoStep,
} from "@/lib/marketing/demo-timeline";
import { reviewDemoSaved } from "@/lib/marketing/review-demo";

/**
 * The Net Worth demo: a monthly check-in is saved, net worth updates, and the
 * history gains a point.
 *
 * Compliance: the numbers are made up, and balances here move only by what
 * the Review demo shows as set aside (TFSA) and paid down (extra debt
 * principal). No market movement is shown, so nothing implies a return. The
 * history includes a month that went down, because real ones do.
 */

export interface NetWorthDemoSnapshot {
  investments: number;
  fixedAssets: number;
  debts: number;
  netWorth: number;
}

function snapshot(investments: number, fixedAssets: number, debts: number): NetWorthDemoSnapshot {
  return { investments, fixedAssets, debts, netWorth: investments + fixedAssets - debts };
}

const FIXED_ASSETS = 14_000;

/** Earlier check-ins, oldest first. The fourth is a month where a debt went up. */
const EARLIER: NetWorthDemoSnapshot[] = [
  snapshot(19_900, FIXED_ASSETS, 12_400),
  snapshot(20_600, FIXED_ASSETS, 12_100),
  snapshot(21_300, FIXED_ASSETS, 11_800),
  snapshot(21_300, FIXED_ASSETS, 12_300),
  snapshot(22_000, FIXED_ASSETS, 12_000),
];

export const NET_WORTH_DEMO_LAST_MONTH = EARLIER[EARLIER.length - 1];

/** This month's check-in: last month plus what the Review demo set aside and paid down. */
export const NET_WORTH_DEMO_THIS_MONTH = snapshot(
  NET_WORTH_DEMO_LAST_MONTH.investments + reviewDemoSaved("tfsa"),
  FIXED_ASSETS,
  NET_WORTH_DEMO_LAST_MONTH.debts - reviewDemoSaved("debt_principal"),
);

/** Every check-in on the chart, oldest first. The last one is this month's. */
export const NET_WORTH_DEMO_HISTORY: readonly NetWorthDemoSnapshot[] = [
  ...EARLIER,
  NET_WORTH_DEMO_THIS_MONTH,
];

/** The four lines of the check-in summary, in the order the app lists them. */
export const NET_WORTH_DEMO_SUMMARY_ROWS = 4;

export type NetWorthDemoPress = "checkIn" | "save";

interface NetWorthDemoState extends DemoBaseState {
  pressed: NetWorthDemoPress | null;
  sheetOpen: boolean;
  /** How many summary lines the check-in has shown. */
  sheetRows: number;
  /** True once the snapshot is saved and the totals update. */
  saved: boolean;
  /** True once this month's point is on the history. */
  plotted: boolean;
}

export interface NetWorthDemoFrame extends NetWorthDemoState {
  /** The totals the page shows right now. */
  current: NetWorthDemoSnapshot;
  /** How many check-ins the history shows. */
  points: number;
}

const INITIAL: NetWorthDemoState = {
  step: 0,
  resetting: false,
  pressed: null,
  sheetOpen: false,
  sheetRows: 0,
  saved: false,
  plotted: false,
};

type Keyframe = DemoKeyframe<NetWorthDemoState>;

const SUMMARY_REVEALS: Keyframe[] = Array.from({ length: NET_WORTH_DEMO_SUMMARY_ROWS }, (_, index) => ({
  at: 2_200 + index * 450,
  set: { sheetRows: index + 1 },
}));

const SCRIPT: Keyframe[] = [
  // 1. Save a monthly check-in.
  { at: 1_400, set: { pressed: "checkIn" } },
  { at: 1_700, set: { pressed: null, sheetOpen: true } },
  ...SUMMARY_REVEALS,
  { at: 4_800, set: { pressed: "save" } },
  { at: 5_100, set: { pressed: null, sheetOpen: false } },
  // 2. Net worth updates.
  { at: 5_500, set: { step: 1, saved: true } },
  // 3. The history gains a point.
  { at: 7_600, set: { step: 2 } },
  { at: 8_100, set: { plotted: true } },
];

export const NET_WORTH_DEMO_TIMELINE = createDemoTimeline<NetWorthDemoState, NetWorthDemoFrame>({
  initial: INITIAL,
  keyframes: SCRIPT,
  derive: (state) => ({
    ...state,
    current: state.saved ? NET_WORTH_DEMO_THIS_MONTH : NET_WORTH_DEMO_LAST_MONTH,
    points: state.plotted ? NET_WORTH_DEMO_HISTORY.length : NET_WORTH_DEMO_HISTORY.length - 1,
  }),
});

export const NET_WORTH_DEMO_STEPS: readonly DemoStep[] = [
  { label: "Save a check-in", detail: "once a month" },
  { label: "See your net worth", detail: "own minus owe" },
  { label: "Follow the history", detail: "month by month" },
];

export const NET_WORTH_DEMO_ALT =
  "Illustration of a monthly check-in in Mosaic: investments, fixed assets, and debts are saved as a snapshot, net worth updates, and a new point is added to the net worth history.";

export const NET_WORTH_DEMO_NOTE =
  "Illustration. Made-up numbers, not a forecast. Net worth can go down as well as up.";

/** The two ends of the history's time axis. */
export const NET_WORTH_DEMO_AXIS = {
  start: "5 months ago",
  end: "This month",
} as const;
