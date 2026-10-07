import { describe, expect, it } from "vitest";
import { derivedScoreDelta, guaranteeEligible } from "@/lib/health-score/guarantee";

describe("derivedScoreDelta", () => {
  it("ignores report-sourced scores so a rubric change is not a drop", () => {
    const rows = [
      { score: 68, source: "report", recorded_at: "2026-09-30T14:38:00Z" },
      { score: 51, source: "derived", recorded_at: "2026-10-06T17:36:00Z" },
      { score: 57, source: "derived", recorded_at: "2026-10-07T04:42:00Z" },
    ];
    expect(derivedScoreDelta(rows)).toBe(6);
  });

  it("needs two derived points before it reports a delta", () => {
    expect(derivedScoreDelta([])).toBeNull();
    expect(
      derivedScoreDelta([
        { score: 68, source: "report", recorded_at: "2026-09-30T00:00:00Z" },
        { score: 51, source: "derived", recorded_at: "2026-10-06T00:00:00Z" },
      ]),
    ).toBeNull();
  });

  it("orders by recorded_at regardless of input order", () => {
    const rows = [
      { score: 60, source: "derived", recorded_at: "2026-12-01T00:00:00Z" },
      { score: 50, source: "derived", recorded_at: "2026-10-01T00:00:00Z" },
    ];
    expect(derivedScoreDelta(rows)).toBe(10);
  });
});

describe("guaranteeEligible", () => {
  it("requires 13 logged weeks, 3 snapshots, and no improvement", () => {
    expect(guaranteeEligible({ weeksLogged: 13, snapshots: 3, scoreDelta: 0 })).toBe(true);
    expect(guaranteeEligible({ weeksLogged: 13, snapshots: 3, scoreDelta: -4 })).toBe(true);
    expect(guaranteeEligible({ weeksLogged: 13, snapshots: 3, scoreDelta: 1 })).toBe(false);
    expect(guaranteeEligible({ weeksLogged: 12, snapshots: 3, scoreDelta: 0 })).toBe(false);
    expect(guaranteeEligible({ weeksLogged: 13, snapshots: 2, scoreDelta: 0 })).toBe(false);
    expect(guaranteeEligible({ weeksLogged: 13, snapshots: 3, scoreDelta: null })).toBe(false);
  });
});
