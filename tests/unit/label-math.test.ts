import { describe, expect, it } from "vitest";
import {
  adjustBars,
  computeHorizonLabels,
  entryDateFor,
  type DailyBar,
} from "@/lib/signals/label-math";
import { decileEdges, decileOf } from "@/lib/signals/base-rates";
import { expectedSlotsForUtcDay } from "@/lib/signals/gap-detection";

/** Flat synthetic bar: fully-adjusted source (no adjClose). */
function bar(date: string, price: number, spread = 0): DailyBar {
  return {
    date,
    open: price,
    high: price + spread,
    low: price - spread,
    close: price,
  };
}

describe("adjustBars — corporate actions", () => {
  it("neutralizes a 10:1 reverse split inside a label window", () => {
    // Raw (unadjusted) series: $1.00 stock reverse-splits 10:1 on day 3.
    // Economically flat — every label must come out ~0, not -90% MAE.
    const raw: DailyBar[] = [
      { date: "2026-01-05", open: 1, high: 1, low: 1, close: 1, adjClose: 10 },
      { date: "2026-01-06", open: 1, high: 1, low: 1, close: 1, adjClose: 10 },
      // Split effective: raw prices jump to 10, adjustment factor becomes 1
      { date: "2026-01-07", open: 10, high: 10, low: 10, close: 10, adjClose: 10 },
      { date: "2026-01-08", open: 10, high: 10, low: 10, close: 10, adjClose: 10 },
      { date: "2026-01-09", open: 10, high: 10, low: 10, close: 10, adjClose: 10 },
    ];
    const adjusted = adjustBars(raw);
    const labels = computeHorizonLabels("2026-01-05", adjusted);

    const h3 = labels.find((l) => l.horizonDays === 3)!;
    expect(h3.forwardReturn).toBeCloseTo(0, 10);
    expect(h3.maxAdverseExcursion).toBeCloseTo(0, 10);
    expect(h3.maxFavorableExcursion).toBeCloseTo(0, 10);
    expect(h3.popLabel).toBe(false);
    expect(h3.dumpLabel).toBe(false);

    const h5 = labels.find((l) => l.horizonDays === 5)!;
    expect(h5.forwardReturn).toBeCloseTo(0, 10);
  });

  it("neutralizes a forward split with a real move on top", () => {
    // 4:1 split on day 2; stock also gains 10% economically by day 3.
    const raw: DailyBar[] = [
      { date: "2026-02-02", open: 100, high: 100, low: 100, close: 100, adjClose: 25 },
      { date: "2026-02-03", open: 26, high: 26, low: 26, close: 26, adjClose: 26 },
      { date: "2026-02-04", open: 27.5, high: 27.5, low: 27.5, close: 27.5, adjClose: 27.5 },
    ];
    const labels = computeHorizonLabels("2026-02-02", adjustBars(raw));
    const h3 = labels.find((l) => l.horizonDays === 3)!;
    // 27.5 / 25 - 1 = +10%
    expect(h3.forwardReturn).toBeCloseTo(0.1, 10);
    expect(h3.popLabel).toBe(true);
    expect(h3.dumpLabel).toBe(false);
  });

  it("neutralizes an ex-dividend drop (dividend is not a dump)", () => {
    // $100 stock pays a $5 dividend; raw price gaps to 95 on the ex-date
    // and stays flat. Total return is 0 — dump label must NOT fire.
    const raw: DailyBar[] = [
      // Pre-ex-date bars carry the dividend adjustment: 95/100
      { date: "2026-03-02", open: 100, high: 100, low: 100, close: 100, adjClose: 95 },
      { date: "2026-03-03", open: 100, high: 100, low: 100, close: 100, adjClose: 95 },
      // Ex-date: raw drops to 95, now fully adjusted
      { date: "2026-03-04", open: 95, high: 95, low: 95, close: 95, adjClose: 95 },
      { date: "2026-03-05", open: 95, high: 95, low: 95, close: 95, adjClose: 95 },
      { date: "2026-03-06", open: 95, high: 95, low: 95, close: 95, adjClose: 95 },
    ];
    const labels = computeHorizonLabels("2026-03-02", adjustBars(raw));
    const h3 = labels.find((l) => l.horizonDays === 3)!;
    expect(h3.forwardReturn).toBeCloseTo(0, 10);
    expect(h3.maxAdverseExcursion).toBeCloseTo(0, 10);
    expect(h3.dumpLabel).toBe(false);

    // Sanity: WITHOUT adjustment the same series would read as a -5% dump
    const unadjusted = raw.map(({ adjClose: _unused, ...b }) => b);
    const badLabels = computeHorizonLabels("2026-03-02", adjustBars(unadjusted));
    const badH3 = badLabels.find((l) => l.horizonDays === 3)!;
    expect(badH3.maxAdverseExcursion).toBeCloseTo(-0.05, 10);
    expect(badH3.dumpLabel).toBe(true);
  });
});

describe("computeHorizonLabels — window math", () => {
  const bars = adjustBars([
    bar("2026-01-05", 100), //  entry: open 100
    bar("2026-01-06", 104, 2), // high 106, low 102
    bar("2026-01-07", 98, 3), //  high 101, low 95
    bar("2026-01-08", 103, 1),
    bar("2026-01-09", 107, 1),
    bar("2026-01-12", 110, 1),
  ]);

  it("computes forward return, MFE, MAE per horizon (day 1 = entry day)", () => {
    const labels = computeHorizonLabels("2026-01-05", bars);
    const h3 = labels.find((l) => l.horizonDays === 3)!;
    // Window = Jan 5,6,7. Close day 3 = 98.
    expect(h3.forwardReturn).toBeCloseTo(-0.02, 10);
    expect(h3.maxFavorableExcursion).toBeCloseTo(0.06, 10); // high 106
    expect(h3.maxAdverseExcursion).toBeCloseTo(-0.05, 10); // low 95
    expect(h3.popLabel).toBe(true); // touched +5%
    expect(h3.dumpLabel).toBe(true); // touched -5%

    const h5 = labels.find((l) => l.horizonDays === 5)!;
    expect(h5.forwardReturn).toBeCloseTo(0.07, 10); // close 107
    expect(h5.popLabel).toBe(false); // +10% within 5d not touched
  });

  it("only returns horizons whose window has fully closed (no look-ahead)", () => {
    const labels = computeHorizonLabels("2026-01-05", bars);
    expect(labels.map((l) => l.horizonDays)).toEqual([1, 3, 5]);
    // 6 bars: horizons 10 and 20 are still open — absent, not guessed
  });

  it("sets pop/dump null on horizons without pre-registered thresholds", () => {
    const labels = computeHorizonLabels("2026-01-05", bars);
    const h1 = labels.find((l) => l.horizonDays === 1)!;
    expect(h1.popLabel).toBeNull();
    expect(h1.dumpLabel).toBeNull();
  });

  it("returns nothing when the entry date has no bar", () => {
    expect(computeHorizonLabels("2026-01-04", bars)).toEqual([]);
  });
});

describe("entryDateFor — next market open after scan", () => {
  // Mon Jul 6 .. Fri Jul 10, with Thu Jul 9 a synthetic holiday (no bar)
  const tradingDates = [
    "2026-07-06",
    "2026-07-07",
    "2026-07-08",
    "2026-07-10",
  ];

  it("intraday scan (market hours) enters at the NEXT day's open", () => {
    // Tue Jul 7 15:00 UTC = 11:00 ET (EDT, UTC-4) — after the open
    const scan = new Date("2026-07-07T15:00:00Z");
    expect(entryDateFor(scan, tradingDates)).toBe("2026-07-08");
  });

  it("pre-market scan enters at the SAME day's open", () => {
    // Tue Jul 7 07:00 UTC = 03:00 ET — before 09:30
    const scan = new Date("2026-07-07T07:00:00Z");
    expect(entryDateFor(scan, tradingDates)).toBe("2026-07-07");
  });

  it("boundary: 13:30 UTC in July is exactly 09:30 EDT — not strictly after", () => {
    const scan = new Date("2026-07-07T13:30:00Z");
    expect(entryDateFor(scan, tradingDates)).toBe("2026-07-08");
  });

  it("DST: 13:30 UTC in January is 08:30 EST — still pre-market", () => {
    const winterDates = ["2026-01-05", "2026-01-06", "2026-01-07"];
    const scan = new Date("2026-01-06T13:30:00Z");
    expect(entryDateFor(scan, winterDates)).toBe("2026-01-06");
    // And 14:30 UTC = 09:30 EST exactly — next day
    const atOpen = new Date("2026-01-06T14:30:00Z");
    expect(entryDateFor(atOpen, winterDates)).toBe("2026-01-07");
  });

  it("skips holidays: scan on the day before a no-bar day lands after it", () => {
    // Wed Jul 8 18:00 UTC (intraday) → next calendar day Jul 9 has no bar
    // (holiday) → entry is Fri Jul 10
    const scan = new Date("2026-07-08T18:00:00Z");
    expect(entryDateFor(scan, tradingDates)).toBe("2026-07-10");
  });

  it("weekend scans roll to Monday", () => {
    const nextWeek = ["2026-07-13", "2026-07-14"];
    const scan = new Date("2026-07-11T02:00:00Z"); // Friday night ET
    expect(entryDateFor(scan, [...tradingDates, ...nextWeek])).toBe(
      "2026-07-13",
    );
  });

  it("returns null when the series does not extend past the scan", () => {
    const scan = new Date("2026-07-10T18:00:00Z");
    expect(entryDateFor(scan, tradingDates)).toBeNull();
  });
});

describe("decile bucketing", () => {
  it("computes stable edges and assigns 0..9", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    const edges = decileEdges(values);
    expect(edges).toHaveLength(9);
    expect(decileOf(1, edges)).toBe(0);
    expect(decileOf(100, edges)).toBe(9);
    expect(decileOf(55, edges)).toBe(5);
  });
});

describe("expectedSlotsForUtcDay — cron schedule mirror", () => {
  it("weekday: 18 intraday slots + 1 nightly", () => {
    const monday = new Date("2026-07-06T00:00:00Z");
    const slots = expectedSlotsForUtcDay(monday);
    expect(slots).toHaveLength(19);
    expect(slots).toContain("2026-07-06T07:00:00.000Z");
    expect(slots).toContain("2026-07-06T13:00:00.000Z");
    expect(slots).toContain("2026-07-06T21:30:00.000Z");
  });

  it("weekend: nightly only", () => {
    const saturday = new Date("2026-07-04T00:00:00Z");
    expect(expectedSlotsForUtcDay(saturday)).toEqual([
      "2026-07-04T07:00:00.000Z",
    ]);
  });
});
