import {
  calculateDerivedHealthScore,
  type HealthScoreInputs,
} from "@/lib/calculations/health-score";
import { amountFromDigits } from "@/lib/tracking/cash-capture";

/**
 * Timeline for the marketing loop demo (homepage How It Works, waitlist page).
 *
 * The demo is an illustration, never a user's data. Every frame is a pure
 * function of time, so the component only has to ask "what is on screen at t".
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

export const LOOP_DEMO_DURATION_MS = 14_000;
/** A frame from the settled end of the loop, shown when motion is reduced. */
export const LOOP_DEMO_STILL_AT_MS = 12_000;

export type LoopDemoPress = "log" | "category" | "snapshot";

export interface LoopDemoFrame {
  /** Which of the three loop steps the caption names. */
  step: 0 | 1 | 2;
  pressed: LoopDemoPress | null;
  pressedKey: string | null;
  sheetOpen: boolean;
  digits: string;
  logged: boolean;
  snapshotSaved: boolean;
  /** How many of the two habits the Score has caught up with. */
  scoreStage: 0 | 1 | 2;
  /** True while the screen is faded out so the loop restarts unseen. */
  resetting: boolean;
  score: number;
  weeks: number;
  spent: number;
}

type LoopDemoState = Omit<LoopDemoFrame, "score" | "weeks" | "spent">;

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

interface Keyframe {
  at: number;
  set: Partial<LoopDemoState>;
}

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
  // Fade out, rewind while hidden, and the next loop fades back in.
  { at: 12_800, set: { resetting: true } },
  { at: 13_300, set: { ...INITIAL, resetting: true } },
];

const KEYFRAMES = [...SCRIPT].sort((a, b) => a.at - b.at);

/** Every time the picture changes, in order. Zero is the loop restart. */
export const LOOP_DEMO_CHANGE_TIMES: readonly number[] = [
  0,
  ...new Set(KEYFRAMES.map((keyframe) => keyframe.at)),
];

function wrap(timeMs: number): number {
  const t = timeMs % LOOP_DEMO_DURATION_MS;
  return t < 0 ? t + LOOP_DEMO_DURATION_MS : t;
}

export function loopDemoFrame(timeMs: number): LoopDemoFrame {
  const t = wrap(timeMs);
  let state = INITIAL;
  for (const keyframe of KEYFRAMES) {
    if (keyframe.at > t) break;
    state = { ...state, ...keyframe.set };
  }
  return {
    ...state,
    score: LOOP_DEMO_SCORES[state.scoreStage],
    weeks: LOOP_DEMO_WEEKS_BEFORE + (state.logged ? 1 : 0),
    spent: state.logged ? LOOP_DEMO_SPEND : 0,
  };
}

/** Milliseconds from `timeMs` until the picture next changes. Always positive. */
export function msUntilLoopDemoChange(timeMs: number): number {
  const t = wrap(timeMs);
  const next = LOOP_DEMO_CHANGE_TIMES.find((at) => at > t) ?? LOOP_DEMO_DURATION_MS;
  return next - t;
}

/** Copy that exists only in the demo. Screen labels reuse the app's own wording. */
export const LOOP_DEMO_ALT =
  "Illustration of the weekly loop in Mosaic: a spend is logged on the keypad, the weekly log and the monthly net worth snapshot are marked done, and the Financial Health Score updates.";

export const LOOP_DEMO_NOTE =
  "Illustration. The Score measures tracking consistency, not investment returns.";

export const LOOP_DEMO_CONTROLS = {
  pause: "Pause demo",
  play: "Play demo",
} as const;
