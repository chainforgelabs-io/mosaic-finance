import { describe, expect, it } from "vitest";
import {
  DEMO_DURATION_MS,
  DEMO_STILL_AT_MS,
  createDemoTimeline,
  type DemoBaseState,
  type DemoStep,
  type DemoTimeline,
} from "@/lib/marketing/demo-timeline";
import {
  NET_WORTH_DEMO_ALT,
  NET_WORTH_DEMO_AXIS,
  NET_WORTH_DEMO_HISTORY,
  NET_WORTH_DEMO_LAST_MONTH,
  NET_WORTH_DEMO_NOTE,
  NET_WORTH_DEMO_STEPS,
  NET_WORTH_DEMO_SUMMARY_ROWS,
  NET_WORTH_DEMO_THIS_MONTH,
  NET_WORTH_DEMO_TIMELINE,
} from "@/lib/marketing/net-worth-demo";
import {
  REVIEW_DEMO,
  REVIEW_DEMO_ALT,
  REVIEW_DEMO_NOTE,
  REVIEW_DEMO_STEPS,
  REVIEW_DEMO_TILES,
  REVIEW_DEMO_TIMELINE,
  reviewDemoSaved,
} from "@/lib/marketing/review-demo";
import { TRACKING_PICTURE_COPY } from "@/lib/marketing/tracking-picture";

function framesOf<F>(timeline: DemoTimeline<F>) {
  return timeline.changeTimes.map((at) => ({ at, frame: timeline.frameAt(at) }));
}

const TIMELINES: [string, DemoTimeline<DemoBaseState>, readonly DemoStep[]][] = [
  ["review", REVIEW_DEMO_TIMELINE, REVIEW_DEMO_STEPS],
  ["net worth", NET_WORTH_DEMO_TIMELINE, NET_WORTH_DEMO_STEPS],
];

describe.each(TIMELINES)("%s demo clockwork", (_name, timeline, steps) => {
  it("restarts on the frame it began with", () => {
    const { resetting, ...last } = timeline.frameAt(timeline.durationMs - 1);
    const { resetting: firstResetting, ...first } = timeline.frameAt(0);
    expect(resetting).toBe(true);
    expect(firstResetting).toBe(false);
    expect(last).toEqual(first);
    expect(timeline.frameAt(timeline.durationMs * 2 + 4_200)).toEqual(timeline.frameAt(4_200));
  });

  it("always schedules the next change in the future, inside the loop", () => {
    expect(timeline.durationMs).toBe(DEMO_DURATION_MS);
    expect([...timeline.changeTimes]).toEqual([...timeline.changeTimes].sort((a, b) => a - b));
    for (const at of timeline.changeTimes) {
      const wait = timeline.msUntilChange(at);
      expect(wait).toBeGreaterThan(0);
      expect(at + wait).toBeLessThanOrEqual(timeline.durationMs);
    }
    expect(timeline.msUntilChange(timeline.durationMs - 1)).toBe(1);
  });

  it("walks the three captions in order and never goes back", () => {
    expect(steps).toHaveLength(3);
    const visited = framesOf(timeline)
      .filter(({ frame }) => !frame.resetting)
      .map(({ frame }) => frame.step);
    expect(visited).toEqual([...visited].sort((a, b) => a - b));
    expect(new Set(visited)).toEqual(new Set([0, 1, 2]));
    expect(timeline.frameAt(DEMO_STILL_AT_MS)).toMatchObject({ step: 2, resetting: false });
  });

  it("keeps each caption short enough to sit on one line", () => {
    for (const step of steps) {
      expect(`${step.label} ${step.detail}`.length).toBeLessThanOrEqual(36);
    }
  });
});

describe("demo timeline builder", () => {
  it("refuses a keyframe that would collide with the fade-out", () => {
    const initial: DemoBaseState = { step: 0, resetting: false };
    expect(() => createDemoTimeline({ initial, keyframes: [{ at: 13_000, set: { step: 1 } }] })).toThrow();
    expect(() => createDemoTimeline({ initial, keyframes: [{ at: 0, set: { step: 1 } }] })).toThrow();
  });
});

describe("review demo numbers", () => {
  it("come out of the Review maths as round, readable figures", () => {
    expect(REVIEW_DEMO.totals).toEqual({ income: 4_900, expense: 2_960, savings: 1_000 });
    expect(REVIEW_DEMO.balance).toBe(940);
    expect(REVIEW_DEMO.rate.active).toBeCloseTo(0.204, 3);
    expect(REVIEW_DEMO.rate.passive).toBeCloseTo(0.396, 3);
  });

  it("show a month that is not perfect: one category over, the rest inside", () => {
    const { rows, totals } = REVIEW_DEMO.expenses;
    expect(rows.map((row) => row.category)).toEqual(["housing", "groceries", "transportation", "dining"]);
    const over = rows.filter((row) => (row.excess ?? 0) > 0);
    expect(over.map((row) => row.category)).toEqual(["dining"]);
    expect(over[0]).toMatchObject({ tracked: 240, budget: 200, excess: 40 });
    expect(totals).toMatchObject({ tracked: 2_960, budget: 3_000, remaining: 40 });
    expect(rows.reduce((sum, row) => sum + row.tracked, 0)).toBe(totals.tracked);
  });

  it("tracks exactly what the plan set aside", () => {
    expect(REVIEW_DEMO.savings.totals).toMatchObject({ tracked: 1_000, budget: 1_000 });
    expect(reviewDemoSaved("tfsa")).toBe(700);
    expect(reviewDemoSaved("debt_principal")).toBe(300);
    expect(() => reviewDemoSaved("rrsp")).toThrow();
  });
});

describe("review demo timeline", () => {
  const frames = framesOf(REVIEW_DEMO_TIMELINE);

  it("opens empty and fills the tiles before the table", () => {
    expect(REVIEW_DEMO_TIMELINE.frameAt(0)).toMatchObject({
      tiles: 0,
      rows: 0,
      flagged: false,
      pressed: null,
      rateMode: "active",
    });
    for (const { at, frame } of frames) {
      if (frame.rows > 0) expect(frame.tiles, `at ${at}ms`).toBe(REVIEW_DEMO_TILES);
    }
  });

  it("only calls out the over-budget row once every row is on screen", () => {
    const rowCount = REVIEW_DEMO.expenses.rows.length;
    for (const { at, frame } of frames) {
      if (frame.flagged) expect(frame.rows, `at ${at}ms`).toBe(rowCount);
    }
    expect(frames.some(({ frame }) => frame.flagged)).toBe(true);
  });

  it("taps the savings-rate toggle before it switches, and ends where it began", () => {
    const modes = frames.filter(({ frame }) => !frame.resetting).map(({ frame }) => frame.rateMode);
    expect([...new Set(modes)]).toEqual(["active", "passive"]);
    for (const [index, { at, frame }] of frames.entries()) {
      if (frame.pressed == null) continue;
      expect(frame.step, `at ${at}ms`).toBe(2);
      expect(frames[index + 1].frame.rateMode, `after ${at}ms`).toBe(frame.pressed);
    }
    expect(REVIEW_DEMO_TIMELINE.frameAt(DEMO_STILL_AT_MS)).toMatchObject({
      rateMode: "active",
      pressed: null,
      flagged: true,
    });
  });
});

describe("net worth demo numbers", () => {
  it("add up: net worth is what is owned minus what is owed, at every check-in", () => {
    for (const snapshot of NET_WORTH_DEMO_HISTORY) {
      expect(snapshot.netWorth).toBe(snapshot.investments + snapshot.fixedAssets - snapshot.debts);
    }
    expect(NET_WORTH_DEMO_HISTORY.map((snapshot) => snapshot.netWorth)).toEqual([
      21_500, 22_500, 23_500, 23_000, 24_000, 25_000,
    ]);
    expect(NET_WORTH_DEMO_HISTORY.at(-1)).toBe(NET_WORTH_DEMO_THIS_MONTH);
    expect(NET_WORTH_DEMO_HISTORY.at(-2)).toBe(NET_WORTH_DEMO_LAST_MONTH);
  });

  it("move this month only by what the Review demo set aside and paid down", () => {
    const before = NET_WORTH_DEMO_LAST_MONTH;
    const after = NET_WORTH_DEMO_THIS_MONTH;
    expect(after.investments - before.investments).toBe(reviewDemoSaved("tfsa"));
    expect(before.debts - after.debts).toBe(reviewDemoSaved("debt_principal"));
    expect(after.fixedAssets).toBe(before.fixedAssets);
    // No market movement anywhere: the change is the month's tracked savings, nothing more.
    expect(after.netWorth - before.netWorth).toBe(REVIEW_DEMO.totals.savings);
  });

  it("include a month that went down", () => {
    const values = NET_WORTH_DEMO_HISTORY.map((snapshot) => snapshot.netWorth);
    expect(values.some((value, index) => index > 0 && value < values[index - 1])).toBe(true);
  });

  it("label the axis without calendar dates", () => {
    expect(NET_WORTH_DEMO_AXIS.start).toBe(`${NET_WORTH_DEMO_HISTORY.length - 1} months ago`);
    expect(NET_WORTH_DEMO_AXIS.end).toBe("This month");
  });
});

describe("net worth demo timeline", () => {
  const frames = framesOf(NET_WORTH_DEMO_TIMELINE);

  it("opens on last month's totals with this month not yet on the chart", () => {
    expect(NET_WORTH_DEMO_TIMELINE.frameAt(0)).toMatchObject({
      sheetOpen: false,
      sheetRows: 0,
      saved: false,
      plotted: false,
      current: NET_WORTH_DEMO_LAST_MONTH,
      points: NET_WORTH_DEMO_HISTORY.length - 1,
    });
  });

  it("shows the whole check-in summary before pressing save", () => {
    for (const { at, frame } of frames) {
      if (frame.pressed === "save") {
        expect(frame.sheetOpen, `at ${at}ms`).toBe(true);
        expect(frame.sheetRows, `at ${at}ms`).toBe(NET_WORTH_DEMO_SUMMARY_ROWS);
      }
      if (frame.pressed === "checkIn") expect(frame.sheetOpen, `at ${at}ms`).toBe(false);
    }
    expect(frames.some(({ frame }) => frame.pressed === "save")).toBe(true);
  });

  it("never updates the totals or the chart before the snapshot is saved", () => {
    for (const { at, frame } of frames) {
      if (frame.plotted) expect(frame.saved, `at ${at}ms`).toBe(true);
      if (frame.saved) expect(frame.sheetOpen, `at ${at}ms`).toBe(false);
      expect(frame.current, `at ${at}ms`).toBe(
        frame.saved ? NET_WORTH_DEMO_THIS_MONTH : NET_WORTH_DEMO_LAST_MONTH,
      );
    }
    expect(NET_WORTH_DEMO_TIMELINE.frameAt(DEMO_STILL_AT_MS)).toMatchObject({
      saved: true,
      plotted: true,
      current: NET_WORTH_DEMO_THIS_MONTH,
      points: NET_WORTH_DEMO_HISTORY.length,
    });
  });
});

describe("tracking picture copy compliance", () => {
  const FORBIDDEN = [
    /financial advisor/i,
    /financial planner/i,
    /AI advisor/i,
    /asset allocation/i,
    /which account to prioriti[sz]e/i,
    /we recommend/i,
    /you should/i,
    /guarantee/i,
    /returns?\b/i,
    /performance/i,
    /dollars saved/i,
    /follow(ing)? (the )?action/i,
    /grow(s|th|ing)? your (net worth|wealth|money)/i,
    /build(s|ing)? (your )?wealth/i,
    /\bfree\b/i, // entitlement claims stay on the pricing surfaces
    /\$\s?\d/, // no dollar figures in copy: the numbers live in the illustration
  ];

  const { review, netWorth, ...section } = TRACKING_PICTURE_COPY;
  const COPY = [
    ...Object.values(section),
    ...Object.values(review),
    ...Object.values(netWorth),
    REVIEW_DEMO_ALT,
    REVIEW_DEMO_NOTE,
    NET_WORTH_DEMO_ALT,
    NET_WORTH_DEMO_NOTE,
    ...REVIEW_DEMO_STEPS.flatMap((step) => [step.label, step.detail]),
    ...NET_WORTH_DEMO_STEPS.flatMap((step) => [step.label, step.detail]),
    ...Object.values(NET_WORTH_DEMO_AXIS),
  ];

  it("never uses advice, performance, or entitlement language", () => {
    for (const text of COPY) {
      for (const pattern of FORBIDDEN) {
        expect(text, `"${text}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("says each demo is an illustration with made-up numbers", () => {
    for (const note of [REVIEW_DEMO_NOTE, NET_WORTH_DEMO_NOTE]) {
      expect(note).toMatch(/^Illustration\. Made-up numbers/);
      expect(note).toMatch(/not a (target or a )?forecast/);
    }
    expect(REVIEW_DEMO_ALT).toMatch(/^Illustration/);
    expect(NET_WORTH_DEMO_ALT).toMatch(/^Illustration/);
  });

  it("says net worth can fall, and that the section is education", () => {
    expect(NET_WORTH_DEMO_NOTE).toMatch(/can go down as well as up/);
    expect(TRACKING_PICTURE_COPY.netWorth.body).toMatch(/does not predict/);
    expect(TRACKING_PICTURE_COPY.intro).toMatch(/Educational information, not financial advice\./);
  });
});
