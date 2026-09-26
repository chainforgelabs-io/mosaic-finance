import { describe, expect, it } from "vitest";
import {
  intendedScanSlot,
  missedScheduledSlots,
} from "@/lib/signals/gap-detection";

describe("intendedScanSlot", () => {
  it("stamps a late 07:20 start as the 07:00 nightly slot", () => {
    expect(intendedScanSlot("nightly", new Date("2026-09-25T07:20:00.000Z"))).toBe(
      "2026-09-25T07:00:00.000Z",
    );
  });

  it("stamps an early 06:50 start as the 07:00 nightly slot", () => {
    expect(intendedScanSlot("nightly", new Date("2026-09-25T06:50:00.000Z"))).toBe(
      "2026-09-25T07:00:00.000Z",
    );
  });

  it("stamps a late weekday start as 18:00", () => {
    expect(intendedScanSlot("intraday", new Date("2026-09-25T18:40:00.000Z"))).toBe(
      "2026-09-25T18:00:00.000Z",
    );
  });
});

describe("missedScheduledSlots", () => {
  const expected = ["2026-09-25T07:00:00.000Z", "2026-09-25T18:00:00.000Z"];

  it("treats a heartbeat rounded to 07:30 as covering 07:00", () => {
    expect(
      missedScheduledSlots(expected, [
        "2026-09-25T07:30:00.000Z",
        "2026-09-25T18:00:00.000Z",
      ]),
    ).toEqual([]);
  });

  it("reports a slot when nothing landed nearby", () => {
    expect(
      missedScheduledSlots(expected, ["2026-09-25T18:00:00.000Z"]),
    ).toEqual(["2026-09-25T07:00:00.000Z"]);
  });
});
