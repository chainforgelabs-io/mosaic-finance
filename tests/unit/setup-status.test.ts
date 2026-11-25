import { describe, expect, it } from "vitest";
import { nextSetupItem, setupItemHref, setupItemLabel, type SetupStatus } from "@/lib/onboarding/setup-status";

const done: SetupStatus = {
  planSet: true,
  planReviewed: true,
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

  it("keeps a seeded plan on Cash Flow until it is confirmed", () => {
    expect(nextSetupItem({ ...done, planReviewed: false, snapshotEver: false, goalsReviewed: false })).toBe(
      "cash-flow",
    );
    expect(nextSetupItem({ ...done, planReviewed: false })).toBe("cash-flow");
  });

  it("then Net Worth, then Goals", () => {
    expect(nextSetupItem({ ...done, snapshotEver: false, goalsReviewed: false })).toBe("net-worth");
    expect(nextSetupItem({ ...done, goalsReviewed: false })).toBe("goals");
    expect(nextSetupItem(done)).toBeNull();
  });

  it("sends an unconfirmed plan to the plan page", () => {
    expect(setupItemHref("cash-flow", { planSet: true, planReviewed: false })).toBe("/dashboard/cash-flow/plan");
    expect(setupItemHref("cash-flow", { planSet: false, planReviewed: false })).toBe("/dashboard/cash-flow");
    expect(setupItemLabel("cash-flow", { ...done, planReviewed: false })).toBe("Confirm Cash Flow");
    expect(setupItemLabel("cash-flow", done)).toBe("Set up Cash Flow");
  });
});
