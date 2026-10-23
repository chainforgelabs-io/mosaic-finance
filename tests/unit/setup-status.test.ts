import { describe, expect, it } from "vitest";
import { nextSetupItem, type SetupStatus } from "@/lib/onboarding/setup-status";

const done: SetupStatus = {
  planSet: true,
  snapshotEver: true,
  snapshotThisMonth: true,
  goalsCount: 2,
  goalsReviewed: true,
  reminderDay: 1,
  reminderDue: false,
};

describe("nextSetupItem", () => {
  it("points at Cash Flow first", () => {
    expect(nextSetupItem({ ...done, planSet: false, snapshotEver: false, goalsReviewed: false })).toBe(
      "cash-flow",
    );
  });

  it("then Net Worth, then Goals", () => {
    expect(nextSetupItem({ ...done, snapshotEver: false, goalsReviewed: false })).toBe("net-worth");
    expect(nextSetupItem({ ...done, goalsReviewed: false })).toBe("goals");
    expect(nextSetupItem(done)).toBeNull();
  });
});
