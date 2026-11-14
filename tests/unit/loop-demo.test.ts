import { describe, expect, it } from "vitest";
import { calculateDerivedHealthScore } from "@/lib/calculations/health-score";
import {
  LOOP_DEMO_ALT,
  LOOP_DEMO_CHANGE_TIMES,
  LOOP_DEMO_CONTROLS,
  LOOP_DEMO_DIGITS,
  LOOP_DEMO_DURATION_MS,
  LOOP_DEMO_NOTE,
  LOOP_DEMO_SCORES,
  LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE,
  LOOP_DEMO_SPEND,
  LOOP_DEMO_STILL_AT_MS,
  LOOP_DEMO_WEEKS_BEFORE,
  loopDemoFrame,
  msUntilLoopDemoChange,
} from "@/lib/marketing/loop-demo";

/** Every frame the demo can show, one per change in the timeline. */
const FRAMES = LOOP_DEMO_CHANGE_TIMES.map((at) => ({ at, frame: loopDemoFrame(at) }));

describe("loop demo timeline", () => {
  it("opens on an untouched week", () => {
    expect(loopDemoFrame(0)).toMatchObject({
      step: 0,
      sheetOpen: false,
      digits: "",
      logged: false,
      snapshotSaved: false,
      resetting: false,
      spent: 0,
      weeks: LOOP_DEMO_WEEKS_BEFORE,
      score: LOOP_DEMO_SCORES[0],
    });
  });

  it("types the amount one key at a time, then logs exactly that amount", () => {
    const typed = [...new Set(FRAMES.map(({ frame }) => frame.digits).filter(Boolean))];
    expect(typed).toEqual(["4", "42", "425", "4250"]);
    expect(LOOP_DEMO_SPEND).toBe(42.5);

    const logged = FRAMES.find(({ frame }) => frame.logged)!;
    expect(logged.frame.digits).toBe(LOOP_DEMO_DIGITS);
    expect(logged.frame.spent).toBe(LOOP_DEMO_SPEND);
    expect(logged.frame.weeks).toBe(LOOP_DEMO_WEEKS_BEFORE + 1);
    expect(logged.frame.sheetOpen).toBe(false);
  });

  it("only presses keys while the keypad is open", () => {
    for (const { at, frame } of FRAMES) {
      if (frame.pressedKey != null || frame.pressed === "category") {
        expect(frame.sheetOpen, `at ${at}ms`).toBe(true);
      }
    }
  });

  it("never moves the Score ahead of the habit that moves it", () => {
    for (const { at, frame } of FRAMES) {
      const done = Number(frame.logged) + Number(frame.snapshotSaved);
      expect(frame.scoreStage, `at ${at}ms`).toBeLessThanOrEqual(done);
      if (frame.snapshotSaved) expect(frame.logged, `at ${at}ms`).toBe(true);
    }
    expect(loopDemoFrame(LOOP_DEMO_STILL_AT_MS)).toMatchObject({
      step: 2,
      logged: true,
      snapshotSaved: true,
      resetting: false,
      score: LOOP_DEMO_SCORES[2],
    });
  });

  it("restarts on the frame it began with", () => {
    const { resetting, ...last } = loopDemoFrame(LOOP_DEMO_DURATION_MS - 1);
    const { resetting: firstResetting, ...first } = loopDemoFrame(0);
    expect(resetting).toBe(true);
    expect(firstResetting).toBe(false);
    expect(last).toEqual(first);
    expect(loopDemoFrame(LOOP_DEMO_DURATION_MS)).toEqual(loopDemoFrame(0));
    expect(loopDemoFrame(LOOP_DEMO_DURATION_MS * 3 + 5_400)).toEqual(loopDemoFrame(5_400));
  });

  it("always schedules the next change in the future, inside the loop", () => {
    expect([...LOOP_DEMO_CHANGE_TIMES]).toEqual([...LOOP_DEMO_CHANGE_TIMES].sort((a, b) => a - b));
    expect(LOOP_DEMO_CHANGE_TIMES.at(-1)).toBeLessThan(LOOP_DEMO_DURATION_MS);
    for (const at of LOOP_DEMO_CHANGE_TIMES) {
      const wait = msUntilLoopDemoChange(at);
      expect(wait).toBeGreaterThan(0);
      expect(at + wait).toBeLessThanOrEqual(LOOP_DEMO_DURATION_MS);
    }
    expect(msUntilLoopDemoChange(LOOP_DEMO_DURATION_MS - 1)).toBe(1);
  });
});

describe("loop demo Score", () => {
  it("rises with each habit, by the amount the real Score maths gives", () => {
    const [before, afterLog, afterSnapshot] = LOOP_DEMO_SCORES;
    expect(afterLog).toBeGreaterThan(before);
    expect(afterSnapshot).toBeGreaterThan(afterLog);

    const household = {
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
    const start = calculateDerivedHealthScore({
      ...household,
      weeklyStreak: LOOP_DEMO_WEEKS_BEFORE,
      monthlySnapshotStreak: LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE,
    });
    const end = calculateDerivedHealthScore({
      ...household,
      weeklyStreak: LOOP_DEMO_WEEKS_BEFORE + 1,
      monthlySnapshotStreak: LOOP_DEMO_SNAPSHOT_MONTHS_BEFORE + 1,
    });
    expect(start.score).toBe(before);
    expect(end.score).toBe(afterSnapshot);

    // Tracking consistency is the only part of the Score the demo moves.
    const { consistency: startConsistency, ...startRest } = start.breakdown;
    const { consistency: endConsistency, ...endRest } = end.breakdown;
    expect(endRest).toEqual(startRest);
    expect(endConsistency).toBeGreaterThan(startConsistency);
  });
});

describe("loop demo copy compliance", () => {
  const FORBIDDEN = [
    /financial advisor/i,
    /financial planner/i,
    /AI advisor/i,
    /asset allocation/i,
    /which account to prioriti[sz]e/i,
    /we recommend/i,
    /guaranteed return/i,
    /investment return(?!s\.)/i, // "not investment returns." is the disclaimer, allowed
    /dollars saved/i,
    /follow(ing)? (the )?action/i,
    /you should (buy|sell)/i,
  ];
  const COPY = [LOOP_DEMO_ALT, LOOP_DEMO_NOTE, ...Object.values(LOOP_DEMO_CONTROLS)];

  it("says it is an illustration and what the Score measures", () => {
    expect(LOOP_DEMO_NOTE).toMatch(/^Illustration\./);
    expect(LOOP_DEMO_NOTE).toMatch(/tracking consistency, not investment returns\./);
    expect(LOOP_DEMO_ALT).toMatch(/^Illustration/);
  });

  it("never uses advice or performance language", () => {
    for (const text of COPY) {
      for (const pattern of FORBIDDEN) {
        expect(text, `"${text}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
