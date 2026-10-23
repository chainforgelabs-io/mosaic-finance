import { describe, expect, it } from "vitest";
import {
  clampReminderDay,
  reminderDayLabel,
  reminderDue,
  torontoDate,
} from "@/lib/tracking/net-worth-reminder";

describe("reminderDue", () => {
  it("is false before the chosen day", () => {
    expect(
      reminderDue({ day: 15, today: "2026-10-14", lastSnapshotDate: null }),
    ).toBe(false);
  });

  it("is true on the chosen day when no snapshot exists this month", () => {
    expect(
      reminderDue({ day: 15, today: "2026-10-15", lastSnapshotDate: null }),
    ).toBe(true);
    expect(
      reminderDue({ day: 15, today: "2026-10-20", lastSnapshotDate: "2026-09-15" }),
    ).toBe(true);
  });

  it("is false when a snapshot was already saved this month", () => {
    expect(
      reminderDue({ day: 1, today: "2026-10-23", lastSnapshotDate: "2026-10-02" }),
    ).toBe(false);
  });

  it("clamps the day to 1–28", () => {
    expect(clampReminderDay(0)).toBe(1);
    expect(clampReminderDay(31)).toBe(28);
    expect(reminderDue({ day: 40, today: "2026-10-28", lastSnapshotDate: null })).toBe(
      true,
    );
  });
});

describe("reminderDayLabel", () => {
  it("uses the English ordinal", () => {
    expect(reminderDayLabel(1)).toBe("1st");
    expect(reminderDayLabel(2)).toBe("2nd");
    expect(reminderDayLabel(3)).toBe("3rd");
    expect(reminderDayLabel(15)).toBe("15th");
    expect(reminderDayLabel(21)).toBe("21st");
    expect(reminderDayLabel(22)).toBe("22nd");
    expect(reminderDayLabel(23)).toBe("23rd");
  });
});

describe("torontoDate", () => {
  it("returns a YYYY-MM-DD calendar date", () => {
    expect(torontoDate(new Date("2026-10-23T18:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
