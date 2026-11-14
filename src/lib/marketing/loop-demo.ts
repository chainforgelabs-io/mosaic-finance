import {
  calculateDerivedHealthScore,
  type HealthScoreInputs,
} from "@/lib/calculations/health-score";
import { GUARANTEE_ACTIONS } from "@/lib/config/offer";
import {
  createDemoTimeline,
  DEMO_CONTROLS,
  DEMO_DURATION_MS,
  DEMO_STILL_AT_MS,
  type DemoBaseState,
  type DemoKeyframe,
  type DemoStep,
} from "@/lib/marketing/demo-timeline";
import { amountFromDigits } from "@/lib/tracking/cash-capture";

/**
 * Timeline for the weekly loop demo (homepage How It Works, waitlist page).
 *
 * The demo is an illustration, never a user's data.
 *
 * Compliance: the Score on screen comes from the real Health Score maths, and
 * the only inputs that change are the weekly log streak and the monthly
 * snapshot streak. Nothing here shows returns, savings, or a dollar result.
 */

/** Made-up household. Held constant so only tracking consistency moves the Score. */
const DEMO_HOUSEHOLD: Omit<HealthScoreInputs, "weeklyStreak" | "monthlySnapshotStreak"> = {
  annualIncome: 78_000,
  monthlyExpenses: null,
  monthlySavings: 1_000,
  emergencyFundMonths: 3,
  totalDebt: 12_000,
  netWorth: 24_000,
  priorNetWorth: 24_000,
  activeGoals: 1,
  achievedGoals: 0,
};

export const LOOP_DEMO_WEEKS_BEFORE = 5;
export const LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE = 1;

function demoScore(weeklyStreak: number, monthlySnapshotStreak: number): number {
  return calculateDerivedHealthScore({
    ...DEMO_HOUSEHOLD,
    weeklyStreak,
    monthlySnapshotStreak,
  }).score;
}

/** Score before the week is logged, after the log, and after the snapshot. */
export const LOOP_DEMO_SCORES = [
  demoScore(LOOP_DEMO_WEEKS_BEFORE, LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE),
  demoScore(LOOP_DEMO_WEEKS_BEFORE + 1, LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE),
  demoScore(LOOP_DEMO_WEEKS_BEFORE + 1, LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE + 1),
] as const;

/** Keys tapped on the pad, in order. The pad reads digits as cents. */
export const LOOP_DEMO_DIGITS = "4250";
export const LOOP_DEMO_SPEND = amountFromDigits(LOOP_DEMO_DIGITS);

export const LOOP_DEMO_DURATION_MS = DEMO_DURATION_MS;
export const LOOP_DEMO_STILL_AT_MS = DEMO_STILL_AT_MS;

export type LoopDemoPress = "log" | "category" | "snapshot";

interface LoopDemoState extends DemoBaseState {
  pressed: LoopDemoPress | null;
  pressedKey: string | null;
  sheetOpen: boolean;
  digits: string;
  logged: boolean;
  snapshotSaved: boolean;
  /** How many of the two habits the Score has caught up with. */
  scoreStage: 0 | 1 | 2;
}

export interface LoopDemoFrame extends LoopDemoState {
  score: number;
  weeks: number;
  spent: number;
}

const INITIAL: LoopDemoState = {
  step: 0,
  pressed: null,
  pressedKey: null,
  sheetOpen: false,
  digits: "",
  logged: false,
  snapshotSaved: false,
  scoreStage: 0,
  resetting: false,
};

type Keyframe = DemoKeyframe<LoopDemoState>;

const FIRST_KEY_AT = 2_500;
const KEY_GAP = 450;
const KEY_HOLD = 200;

const KEY_PRESSES: Keyframe[] = [...LOOP_DEMO_DIGITS].flatMap((key, index) => {
  const at = FIRST_KEY_AT + index * KEY_GAP;
  return [
    { at, set: { pressedKey: key, digits: LOOP_DEMO_DIGITS.slice(0, index + 1) } },
    { at: at + KEY_HOLD, set: { pressedKey: null } },
  ];
});

const SCRIPT: Keyframe[] = [
  // 1. Log this week.
  { at: 1_400, set: { pressed: "log" } },
  { at: 1_700, set: { pressed: null, sheetOpen: true } },
  ...KEY_PRESSES,
  { at: 4_700, set: { pressed: "category" } },
  { at: 5_000, set: { pressed: null, sheetOpen: false } },
  { at: 5_400, set: { logged: true } },
  { at: 6_000, set: { scoreStage: 1 } },
  // 2. Snapshot net worth.
  { at: 7_000, set: { step: 1 } },
  { at: 7_600, set: { pressed: "snapshot" } },
  { at: 7_900, set: { pressed: null, snapshotSaved: true } },
  { at: 8_500, set: { scoreStage: 2 } },
  // 3. Watch the Score.
  { at: 9_300, set: { step: 2 } },
];

export const LOOP_DEMO_TIMELINE = createDemoTimeline<LoopDemoState, LoopDemoFrame>({
  initial: INITIAL,
  keyframes: SCRIPT,
  derive: (state) => ({
    ...state,
    score: LOOP_DEMO_SCORES[state.scoreStage],
    weeks: LOOP_DEMO_WEEKS_BEFORE + (state.logged ? 1 : 0),
    spent: state.logged ? LOOP_DEMO_SPEND : 0,
  }),
});

/** Every time the picture changes, in order. Zero is the loop restart. */
export const LOOP_DEMO_CHANGE_TIMES = LOOP_DEMO_TIMELINE.changeTimes;

export function loopDemoFrame(timeMs: number): LoopDemoFrame {
  return LOOP_DEMO_TIMELINE.frameAt(timeMs);
}

/** Milliseconds from `timeMs` until the picture next changes. Always positive. */
export function msUntilLoopDemoChange(timeMs: number): number {
  return LOOP_DEMO_TIMELINE.msUntilChange(timeMs);
}

/** The caption under the phone reuses the Guarantee's three actions, word for word. */
export const LOOP_DEMO_STEPS: readonly DemoStep[] = GUARANTEE_ACTIONS.map((action) => ({
  label: action.label,
  detail: action.cadence,
}));

/** Copy that exists only in the demo. Screen labels reuse the app's own wording. */
export const LOOP_DEMO_ALT =
  "Illustration of the weekly loop in Mosaic: a spend is logged on the keypad, the weekly log and the monthly net worth snapshot are marked done, and the Financial Health Score updates.";

export const LOOP_DEMO_NOTE =
  "Illustration. The Score measures tracking consistency, not investment returns.";

export const LOOP_DEMO_CONTROLS = DEMO_CONTROLS;
