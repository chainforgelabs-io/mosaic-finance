import { describe, expect, it } from "vitest";
import { CHARLIE_SECTION_COPY } from "@/lib/marketing/charlie-section";
import { DEMO_STILL_AT_MS } from "@/lib/marketing/demo-timeline";
import {
  DISCOVERY_DEMO_ALT,
  DISCOVERY_DEMO_LABELS,
  DISCOVERY_DEMO_NOTE,
  DISCOVERY_DEMO_STEPS,
  DISCOVERY_DEMO_SUMMARY,
  DISCOVERY_DEMO_THREAD,
  DISCOVERY_DEMO_TIMELINE,
  discoveryDemoText,
  discoveryDemoWordsShown,
} from "@/lib/marketing/discovery-demo";
import { REVIEW_DEMO } from "@/lib/marketing/review-demo";

const FRAMES = DISCOVERY_DEMO_TIMELINE.changeTimes.map((at) => ({
  at,
  frame: DISCOVERY_DEMO_TIMELINE.frameAt(at),
}));
/** The frames a visitor sees, without the hidden rewind at the end of the loop. */
const STORY = FRAMES.filter(({ frame }) => !frame.resetting);

const THREAD = DISCOVERY_DEMO_THREAD.map((item, index) => ({ item, index }));
const CHARLIE = THREAD.filter(({ item }) => item.kind === "charlie");
const REPLIES = THREAD.filter(({ item }) => item.kind === "user");

describe("discovery demo thread", () => {
  it("is a conversation: Charlie asks, the visitor answers, and it ends on the picture", () => {
    expect(DISCOVERY_DEMO_THREAD.map((item) => item.kind)).toEqual([
      "charlie",
      "user",
      "charlie",
      "user",
      "gap",
      "charlie",
      "summary",
    ]);
  });

  it("asks one bold question at a time", () => {
    for (const { item } of CHARLIE.slice(0, 2)) {
      if (item.kind !== "charlie") throw new Error("not a Charlie message");
      const bold = item.words.filter((word) => word.bold).map((word) => word.text).join(" ");
      expect(bold).toMatch(/\?$/);
      expect(bold.match(/\?/g)).toHaveLength(1);
    }
  });

  it("says where the conversation is shortened, then closes the way the app does", () => {
    const gap = DISCOVERY_DEMO_THREAD[4];
    expect(discoveryDemoText(gap)).toBe("A few questions later");
    expect(discoveryDemoText(DISCOVERY_DEMO_THREAD[5])).toBe(
      "Perfect. Let me pull everything together and make sure I've got it right.",
    );
  });
});

describe("discovery demo numbers", () => {
  it("are the plan the Review demo measures the month against", () => {
    expect(DISCOVERY_DEMO_SUMMARY).toEqual({ income: 4_900, expenses: 3_000, savings: 1_000 });
    expect(DISCOVERY_DEMO_SUMMARY.income).toBe(REVIEW_DEMO.income.totals.budget);
    expect(DISCOVERY_DEMO_SUMMARY.expenses).toBe(REVIEW_DEMO.expenses.totals.budget);
    expect(DISCOVERY_DEMO_SUMMARY.savings).toBe(REVIEW_DEMO.savings.totals.budget);
  });

  it("put the take-home figure from the chat on the card", () => {
    expect(discoveryDemoText(DISCOVERY_DEMO_THREAD[3])).toBe("About $4,900 a month.");
    expect(DISCOVERY_DEMO_SUMMARY.income).toBe(REVIEW_DEMO.totals.income);
  });
});

describe("discovery demo timeline", () => {
  it("opens on an empty chat", () => {
    expect(DISCOVERY_DEMO_TIMELINE.frameAt(0)).toMatchObject({
      step: 0,
      shown: 0,
      streaming: false,
      words: 0,
      draft: "",
      pressed: null,
      confirmed: false,
    });
  });

  it("adds to the thread one item at a time and never takes one away", () => {
    for (const [index, { at, frame }] of STORY.entries()) {
      if (index === 0) continue;
      const grew = frame.shown - STORY[index - 1].frame.shown;
      expect([0, 1], `at ${at}ms`).toContain(grew);
    }
    expect(STORY.at(-1)!.frame.shown).toBe(DISCOVERY_DEMO_THREAD.length);
  });

  it("has Charlie think, then arrive a few words at a time, then finish", () => {
    for (const { item, index } of CHARLIE) {
      if (item.kind !== "charlie") throw new Error("not a Charlie message");
      const arriving = STORY.filter(({ frame }) => frame.shown === index + 1);
      expect(arriving[0].frame).toMatchObject({ streaming: true, words: 0 });

      const counts = arriving.map(({ frame }) => discoveryDemoWordsShown(frame, index));
      expect(counts).toEqual([...counts].sort((a, b) => a - b));
      expect(Math.max(...counts)).toBe(item.words.length);

      const settled = arriving.filter(({ frame }) => !frame.streaming);
      expect(settled.length).toBeGreaterThan(0);
      for (const { at, frame } of settled) {
        expect(discoveryDemoWordsShown(frame, index), `at ${at}ms`).toBe(item.words.length);
      }
    }
  });

  it("keeps earlier messages whole while a later one arrives", () => {
    const [first, second] = CHARLIE;
    if (first.item.kind !== "charlie") throw new Error("not a Charlie message");
    for (const { at, frame } of STORY) {
      if (frame.shown <= second.index) continue;
      expect(discoveryDemoWordsShown(frame, first.index), `at ${at}ms`).toBe(first.item.words.length);
    }
    // A message that is not in the thread yet shows nothing.
    expect(discoveryDemoWordsShown(DISCOVERY_DEMO_TIMELINE.frameAt(0), first.index)).toBe(0);
  });

  it("types each reply in full, presses send, and only then adds it to the thread", () => {
    for (const { item, index } of REPLIES) {
      const text = discoveryDemoText(item);
      const sentAt = STORY.findIndex(({ frame }) => frame.shown === index + 1);
      expect(STORY[sentAt - 1].frame).toMatchObject({ draft: text, pressed: "send", shown: index });
      expect(STORY[sentAt].frame).toMatchObject({ draft: "", pressed: null });
    }
  });

  it("only types while Charlie has finished asking", () => {
    for (const { at, frame } of STORY) {
      if (frame.draft === "") continue;
      expect(frame.streaming, `at ${at}ms`).toBe(false);
      const next = DISCOVERY_DEMO_THREAD[frame.shown];
      expect(next.kind, `at ${at}ms`).toBe("user");
      expect(discoveryDemoText(next).startsWith(frame.draft), `at ${at}ms`).toBe(true);
      expect(frame.step, `at ${at}ms`).toBe(1);
    }
  });

  it("confirms the picture only after the whole card is on screen", () => {
    const pressed = STORY.filter(({ frame }) => frame.pressed === "confirm");
    expect(pressed.length).toBeGreaterThan(0);
    for (const { at, frame } of STORY) {
      if (frame.pressed === "confirm" || frame.confirmed) {
        expect(frame.shown, `at ${at}ms`).toBe(DISCOVERY_DEMO_THREAD.length);
        expect(frame.streaming, `at ${at}ms`).toBe(false);
        expect(frame.step, `at ${at}ms`).toBe(2);
      }
      if (frame.confirmed) expect(at).toBeGreaterThan(pressed[0].at);
    }
    expect(DISCOVERY_DEMO_TIMELINE.frameAt(DEMO_STILL_AT_MS)).toMatchObject({
      shown: DISCOVERY_DEMO_THREAD.length,
      streaming: false,
      draft: "",
      pressed: null,
      confirmed: true,
    });
  });
});

describe("discovery demo and Charlie section copy compliance", () => {
  const FORBIDDEN = [
    /advisor/i,
    /planner/i,
    /financial plan\b/i,
    /consultation/i,
    /asset allocation/i,
    /which account to prioriti[sz]e/i,
    /recommend/i,
    /you should/i,
    /guarantee/i,
    /returns?\b/i,
    /performance/i,
    /dollars saved/i,
    /follow(ing)? (the )?action/i,
    /\b(buy|sell)\b/i,
    /\b(CFP|CIM)\b/,
    /human/i,
    /reviewed by/i,
    // The Charlie allowance is never published, and nothing implies there is none.
    /unlimited/i,
    /any ?time/i,
    /as (much|often|many)/i,
    /\bmessages?\b/i,
    /\d+\s*(messages|conversations|chats)/i,
    /\bfree\b/i, // entitlement claims beyond "comes with Progress" stay on the pricing surfaces
  ];
  const NO_DOLLAR_FIGURES = /\$\s?\d/;

  const { points, progressNote, ...section } = CHARLIE_SECTION_COPY;
  const SECTION_COPY = [
    ...Object.values(section),
    ...points.flatMap((point) => [point.title, point.body]),
    ...Object.values(progressNote),
    DISCOVERY_DEMO_ALT,
    DISCOVERY_DEMO_NOTE,
    ...DISCOVERY_DEMO_STEPS.flatMap((step) => [step.label, step.detail]),
  ];
  const { steps, summaryRows, ...labels } = DISCOVERY_DEMO_LABELS;
  const SCREEN_COPY = [
    ...DISCOVERY_DEMO_THREAD.map(discoveryDemoText).filter(Boolean),
    ...steps,
    ...Object.values(summaryRows),
    ...Object.values(labels),
  ];

  it("never uses advice, performance, human-review, or allowance language", () => {
    for (const text of [...SECTION_COPY, ...SCREEN_COPY]) {
      for (const pattern of FORBIDDEN) {
        expect(text, `"${text}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps dollar figures inside the illustration", () => {
    for (const text of SECTION_COPY) {
      expect(text, `"${text}" has a dollar figure`).not.toMatch(NO_DOLLAR_FIGURES);
    }
  });

  it("introduces Charlie as an AI money guide, in the chat and in the section", () => {
    expect(discoveryDemoText(DISCOVERY_DEMO_THREAD[0])).toMatch(/I'm Charlie, your AI money guide\./);
    expect(CHARLIE_SECTION_COPY.intro).toMatch(/^Charlie, your AI money guide,/);
    expect(DISCOVERY_DEMO_STEPS[0]).toEqual({ label: "Meet Charlie", detail: "your AI money guide" });
  });

  it("says the chat is a shortened illustration and that this is education", () => {
    expect(DISCOVERY_DEMO_NOTE).toMatch(/^Illustration\. A shortened, made-up conversation\./);
    expect(DISCOVERY_DEMO_NOTE).toMatch(/Educational information, not financial advice\.$/);
    expect(DISCOVERY_DEMO_ALT).toMatch(/^Illustration/);
    expect(CHARLIE_SECTION_COPY.intro).toMatch(/Educational information, not financial advice\.$/);
  });

  it("says Charlie comes with Progress, for further analysis and help with the app", () => {
    expect(CHARLIE_SECTION_COPY.eyebrow).toBe("Charlie on Progress");
    expect(CHARLIE_SECTION_COPY.progressNote.label).toBe("Included with Progress");
    expect(CHARLIE_SECTION_COPY.progressNote.body).toMatch(/^Charlie comes with a Progress membership\./);
    expect(CHARLIE_SECTION_COPY.progressNote.body).toMatch(/further analysis of your numbers/);
    expect(CHARLIE_SECTION_COPY.progressNote.body).toMatch(/help using Mosaic/);
  });

  it("never names a tier that is not on sale", () => {
    for (const text of [...SECTION_COPY, ...SCREEN_COPY]) {
      expect(text).not.toMatch(/mastery|academy|money club/i);
    }
  });
});
