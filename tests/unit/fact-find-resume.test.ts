import { describe, expect, it } from "vitest";
import { FACT_FIND_SYSTEM_PROMPT } from "@/lib/claude/prompts/fact-find";
import {
  factFindSessionsToAbandon,
  isFactFindStepComplete,
  omitUnaskedInvestmentKnowledge,
  pickFactFindSession,
  profileHasFactFindPicture,
  shouldShowFactFindSummary,
  type FactFindSessionRef,
} from "@/lib/conversation/fact-find-resume";
import { mergeOnboardingDraft, readOnboardingDraft, readRiskDraft } from "@/lib/onboarding/draft";

function session(overrides: Partial<FactFindSessionRef> & Pick<FactFindSessionRef, "id">): FactFindSessionRef {
  return {
    status: "active",
    metadata: {},
    lastActivityAt: "2026-11-19T12:00:00.000Z",
    messageCount: 0,
    ...overrides,
  };
}

describe("pickFactFindSession", () => {
  it("keeps the summarized transcript ahead of a later restart", () => {
    const original = session({
      id: "original",
      status: "completed",
      metadata: { extracted_data: { annual_income: 1 } },
      lastActivityAt: "2026-11-19T12:47:00.000Z",
      messageCount: 40,
    });
    const restart = session({
      id: "restart",
      lastActivityAt: "2026-11-19T12:48:00.000Z",
      messageCount: 4,
    });

    expect(pickFactFindSession([restart, original])?.id).toBe("original");
    expect(factFindSessionsToAbandon([restart, original], original)).toEqual(["restart"]);
  });

  it("keeps the longer mid-chat when neither has a summary", () => {
    const shorter = session({ id: "short", messageCount: 2, lastActivityAt: "2026-11-19T13:00:00.000Z" });
    const longer = session({ id: "long", messageCount: 12, lastActivityAt: "2026-11-19T12:00:00.000Z" });
    expect(pickFactFindSession([shorter, longer])?.id).toBe("long");
  });

  it("ignores abandoned sessions", () => {
    const abandoned = session({
      id: "old",
      status: "abandoned",
      messageCount: 20,
      metadata: { extracted_data: { annual_income: 1 } },
    });
    const current = session({ id: "current", messageCount: 3 });
    expect(pickFactFindSession([abandoned, current])?.id).toBe("current");
  });
});

describe("isFactFindStepComplete", () => {
  it("stays on the confirmation card until the person confirms", () => {
    expect(
      isFactFindStepComplete({
        sessions: [{ status: "completed", metadata: { extracted_data: { province: "SK" } } }],
        profile: { monthly_expenses: null },
      }),
    ).toBe(false);
  });

  it("advances once the monthly picture is saved", () => {
    expect(
      isFactFindStepComplete({
        sessions: [{ status: "completed", metadata: {} }],
        profile: { monthly_expenses: 4000 },
      }),
    ).toBe(true);
    expect(profileHasFactFindPicture(null)).toBe(false);
  });

  it("advances when the confirmation flag is set", () => {
    expect(
      isFactFindStepComplete({
        sessions: [{ status: "completed", metadata: { confirmed: true } }],
        profile: null,
      }),
    ).toBe(true);
  });
});

describe("shouldShowFactFindSummary", () => {
  it("shows the card on the wrap-up and hides it once a correction is in progress", () => {
    expect(
      shouldShowFactFindSummary({
        status: "completed",
        hasExtracted: true,
        lastMessageRole: "assistant",
        lastMessageContent: "Perfect. Let me pull everything together and make sure I've got it right.",
      }),
    ).toBe(true);
    expect(
      shouldShowFactFindSummary({
        status: "active",
        hasExtracted: true,
        lastMessageRole: "user",
        lastMessageContent: "I'd like to correct some of the information I provided earlier.",
      }),
    ).toBe(false);
  });
});

describe("omitUnaskedInvestmentKnowledge", () => {
  it("drops a guessed investment-knowledge label", () => {
    expect(omitUnaskedInvestmentKnowledge({ province: "SK", investment_knowledge: "novice" })).toEqual({
      province: "SK",
    });
  });
});

describe("discovery prompt", () => {
  it("does not ask Charlie to grade investment knowledge during discovery", () => {
    expect(FACT_FIND_SYSTEM_PROMPT).toContain('"investment_knowledge": null');
    expect(FACT_FIND_SYSTEM_PROMPT).toMatch(/Do not infer novice, intermediate, or advanced/);
    expect(FACT_FIND_SYSTEM_PROMPT).not.toContain('"investment_knowledge": "novice|intermediate|advanced"');
  });
});

describe("onboarding draft", () => {
  it("merges a risk draft without dropping the discovery summary", () => {
    const metadata = mergeOnboardingDraft(
      { extracted_data: { province: "SK" }, confirmed: false },
      { risk: { phase: "questionnaire", currentQ: 3, answers: { objective: 4 } } },
    );
    expect(metadata.extracted_data).toEqual({ province: "SK" });
    expect(readOnboardingDraft(metadata).risk).toEqual({
      phase: "questionnaire",
      currentQ: 3,
      answers: { objective: 4 },
    });
  });

  it("clears one step without clearing the others", () => {
    const metadata = mergeOnboardingDraft(
      { onboarding_draft: { risk: { phase: "review", currentQ: 0, answers: {} }, goals: [{ name: "House" }] } },
      { risk: null },
    );
    expect(readOnboardingDraft(metadata).risk).toBeUndefined();
    expect(readOnboardingDraft(metadata).goals).toEqual([{ name: "House" }]);
  });

  it("rejects a malformed risk draft", () => {
    expect(readRiskDraft({ phase: "nope", currentQ: 1, answers: {} })).toBeNull();
  });
});
