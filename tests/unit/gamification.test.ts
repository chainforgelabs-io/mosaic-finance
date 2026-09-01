import { describe, expect, it } from "vitest";
import { computeMonthlyStreak, computeWeeklyStreak } from "@/lib/gamification/streaks";
import { evaluateAchievements, type AchievementContext } from "@/lib/gamification/achievements";

function ctx(partial: Partial<AchievementContext> = {}): AchievementContext {
  return {
    transactionCount: 0,
    weeklyStreak: 0,
    snapshotCount: 0,
    monthlyStreak: 0,
    netWorth: null,
    priorDebtsTotal: null,
    currentDebtsTotal: null,
    emergencyFundMonths: null,
    goalJustAchieved: false,
    ...partial,
  };
}

describe("computeWeeklyStreak", () => {
  it("returns 0 when there are no transactions", () => {
    expect(computeWeeklyStreak([], "2026-08-31")).toEqual({
      current: 0,
      loggedThisWeek: false,
    });
  });

  it("counts consecutive Monday-start weeks including this week", () => {
    const dates = ["2026-08-31", "2026-08-25", "2026-08-18"];
    expect(computeWeeklyStreak(dates, "2026-08-31")).toEqual({
      current: 3,
      loggedThisWeek: true,
    });
  });

  it("keeps last week's streak if this week is not logged yet", () => {
    const dates = ["2026-08-25", "2026-08-18"];
    expect(computeWeeklyStreak(dates, "2026-08-31")).toEqual({
      current: 2,
      loggedThisWeek: false,
    });
  });

  it("breaks when a week is skipped", () => {
    const dates = ["2026-08-31", "2026-08-10"];
    expect(computeWeeklyStreak(dates, "2026-08-31")).toEqual({
      current: 1,
      loggedThisWeek: true,
    });
  });

  it("treats mid-week dates as the current Monday-start week", () => {
    expect(computeWeeklyStreak(["2026-09-02"], "2026-08-31").loggedThisWeek).toBe(true);
    expect(computeWeeklyStreak(["2026-08-30"], "2026-08-31").loggedThisWeek).toBe(false);
  });
});

describe("computeMonthlyStreak", () => {
  it("returns 0 with no snapshots", () => {
    expect(computeMonthlyStreak([], "2026-08-15")).toEqual({
      current: 0,
      snapshottedThisMonth: false,
    });
  });

  it("counts consecutive calendar months", () => {
    expect(computeMonthlyStreak(["2026-08-10", "2026-07-02", "2026-06-30"], "2026-08-31")).toEqual({
      current: 3,
      snapshottedThisMonth: true,
    });
  });

  it("preserves prior months if this month is not saved yet", () => {
    expect(computeMonthlyStreak(["2026-07-15", "2026-06-01"], "2026-08-31")).toEqual({
      current: 2,
      snapshottedThisMonth: false,
    });
  });

  it("breaks across a skipped month", () => {
    expect(computeMonthlyStreak(["2026-08-01", "2026-06-01"], "2026-08-15").current).toBe(1);
  });
});

describe("evaluateAchievements", () => {
  it("awards first transaction and streak badges", () => {
    const unlocked = evaluateAchievements(
      ctx({ transactionCount: 4, weeklyStreak: 12 }),
      new Set(),
    );
    const keys = unlocked.map((a) => a.key);
    expect(keys).toContain("first_transaction");
    expect(keys).toContain("log_streak_4");
    expect(keys).toContain("log_streak_12");
    expect(keys).not.toContain("log_streak_26");
  });

  it("does not re-award already earned keys", () => {
    const unlocked = evaluateAchievements(
      ctx({ transactionCount: 10, weeklyStreak: 26 }),
      new Set(["first_transaction", "log_streak_4"]),
    );
    const keys = unlocked.map((a) => a.key);
    expect(keys).not.toContain("first_transaction");
    expect(keys).toContain("log_streak_12");
    expect(keys).toContain("log_streak_26");
  });

  it("awards snapshot, debt reduction, net worth, emergency fund, and goal badges", () => {
    const unlocked = evaluateAchievements(
      ctx({
        snapshotCount: 3,
        monthlyStreak: 6,
        netWorth: 120_000,
        priorDebtsTotal: 20_000,
        currentDebtsTotal: 15_000,
        emergencyFundMonths: 6.5,
        goalJustAchieved: true,
      }),
      new Set(),
    );
    const keys = unlocked.map((a) => a.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "first_snapshot",
        "snapshot_streak_3",
        "snapshot_streak_6",
        "debt_reduced",
        "net_worth_10k",
        "net_worth_50k",
        "net_worth_100k",
        "emergency_fund_funded",
        "goal_achieved",
      ]),
    );
    expect(keys).not.toContain("net_worth_250k");
    expect(keys).not.toContain("snapshot_streak_12");
  });

  it("does not award debt_reduced when debt increased", () => {
    const unlocked = evaluateAchievements(
      ctx({ priorDebtsTotal: 10_000, currentDebtsTotal: 12_000 }),
      new Set(),
    );
    expect(unlocked.map((a) => a.key)).not.toContain("debt_reduced");
  });
});
