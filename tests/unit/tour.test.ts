import { describe, expect, it } from "vitest";
import { planTotals } from "@/lib/tracking/budget-plan";
import { TOUR_CHAPTERS, TOUR_STEPS, chapterStart, type TourChapter } from "@/lib/onboarding/tour";
import {
  CHECK_IN_AFTER,
  CHECK_IN_BEFORE,
  CHECK_IN_DEMO_TIMELINE,
  LOG_DEMO_TIMELINE,
  PLAN_DEMO_TIMELINE,
  TOGETHER_DEMO_TIMELINE,
  CHECK_IN_DEMO_STEPS,
  CHECK_IN_NOTE,
  LOG_DEMO_STEPS,
  PLAN_DEMO_STEPS,
  TOGETHER_DEMO_STEPS,
  TOGETHER_NOTE,
  TOUR_LOG_ALREADY,
  TOUR_LOG_BUDGET,
  TOUR_LOG_NOTE,
  TOUR_LOG_SPEND,
  TOUR_PAYDOWN,
  TOUR_PLAN_MONTHS,
  TOUR_PLAN_NOTE,
  TOUR_SAVE,
} from "@/lib/onboarding/tour-demos";

const FORBIDDEN = [
  /financial advisor/i,
  /financial planner/i,
  /AI advisor/i,
  /asset allocation/i,
  /which account to prioriti[sz]e/i,
  /we recommend/i,
  /you should (buy|sell)/i,
  /guaranteed return/i,
  /dollars saved/i,
];

describe("tour steps", () => {
  it("walks the chapters in order", () => {
    const seen: TourChapter[] = [];
    for (const step of TOUR_STEPS) {
      if (seen[seen.length - 1] !== step.chapter) seen.push(step.chapter);
    }
    expect(seen).toEqual(TOUR_CHAPTERS.map((chapter) => chapter.id));
  });

  it("starts each chapter on a real page", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(18);
    for (const step of TOUR_STEPS) {
      expect(step.path.startsWith("/dashboard")).toBe(true);
      expect(step.targets.length).toBeGreaterThan(0);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(20);
    }
    expect(chapterStart("logging")).toBe(TOUR_STEPS.findIndex((step) => step.chapter === "logging"));
    expect(chapterStart("all")).toBe(0);
  });

  it("keeps the copy on the education side of the line", () => {
    const extras = [
      ...TOUR_CHAPTERS.map((chapter) => chapter.label),
      "How this page works",
      "Tour",
      "Whole tour",
      "Replay the tour",
      TOUR_PLAN_NOTE,
      TOUR_LOG_NOTE,
      CHECK_IN_NOTE,
      TOGETHER_NOTE,
      ...[PLAN_DEMO_STEPS, LOG_DEMO_STEPS, CHECK_IN_DEMO_STEPS, TOGETHER_DEMO_STEPS].flatMap((steps) =>
        steps.map((step) => `${step.label} ${step.detail}`),
      ),
    ];
    const texts = [...TOUR_STEPS.map((step) => `${step.id} ${step.title} ${step.body}`), ...extras];
    for (const text of texts) {
      for (const pattern of FORBIDDEN) {
        expect(text, `"${text}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("tour examples", () => {
  it("fills the plan with the plan totals", () => {
    const start = PLAN_DEMO_TIMELINE.frameAt(0);
    expect(start.months).toEqual(TOUR_PLAN_MONTHS.map(() => 8233));
    expect(start.income).toBe(8233 * TOUR_PLAN_MONTHS.length);
    expect(start.left).toBe(start.income);

    const filled = PLAN_DEMO_TIMELINE.frameAt(5_400);
    expect(filled.months.every((amount) => amount === 9000)).toBe(true);
    expect(filled.income).toBe(9000 * TOUR_PLAN_MONTHS.length);

    const added = PLAN_DEMO_TIMELINE.frameAt(8_600);
    expect(added.groceries).toBe(400);
    expect(added.expense).toBe(400 * TOUR_PLAN_MONTHS.length);
    expect(added.left).toBe(added.income - added.expense);
    expect(added.left).toBe(
      planTotals(
        TOUR_PLAN_MONTHS.flatMap((_, index) => [
          { kind: "income" as const, category: "paycheque", month: `2026-0${index + 1}-01`, amount: 9000 },
          { kind: "expense" as const, category: "groceries", month: `2026-0${index + 1}-01`, amount: 400 },
        ]),
      ).toBeAllocated,
    );
  });

  it("moves the category bar by the logged amount", () => {
    const before = LOG_DEMO_TIMELINE.frameAt(0);
    expect(before.spent).toBe(TOUR_LOG_ALREADY);
    expect(before.bar).toBe((TOUR_LOG_ALREADY / TOUR_LOG_BUDGET) * 100);
    const after = LOG_DEMO_TIMELINE.frameAt(8_000);
    expect(after.spent).toBe(TOUR_LOG_ALREADY + TOUR_LOG_SPEND);
    expect(after.left).toBe(TOUR_LOG_BUDGET - after.spent);
    expect(after.bar).toBe((after.spent / TOUR_LOG_BUDGET) * 100);
  });

  it("moves net worth only by what was set aside and paid down", () => {
    const before = CHECK_IN_DEMO_TIMELINE.frameAt(0);
    const after = CHECK_IN_DEMO_TIMELINE.frameAt(7_200);
    expect(before.netWorth).toBe(CHECK_IN_BEFORE.netWorth);
    expect(after.netWorth).toBe(CHECK_IN_AFTER.netWorth);
    expect(after.netWorth - before.netWorth).toBe(TOUR_SAVE + TOUR_PAYDOWN);
    expect(after.points).toBe(before.points + 1);

    const carried = TOGETHER_DEMO_TIMELINE.frameAt(8_200);
    expect(carried.netWorth - TOGETHER_DEMO_TIMELINE.frameAt(0).netWorth).toBe(TOUR_SAVE + TOUR_PAYDOWN);
    expect(carried.assets - TOGETHER_DEMO_TIMELINE.frameAt(0).assets).toBe(TOUR_SAVE);
    expect(TOGETHER_DEMO_TIMELINE.frameAt(0).debts - carried.debts).toBe(TOUR_PAYDOWN);
  });
});
