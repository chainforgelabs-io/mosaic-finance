import { describe, expect, it } from "vitest";
import { FACT_FIND_SYSTEM_PROMPT } from "@/lib/claude/prompts/fact-find";
import { canReopenCompletedFactFind } from "@/lib/conversation/reopen-fact-find";

describe("canReopenCompletedFactFind", () => {
  it("reopens a completed fact-find when the client sends a correction", () => {
    expect(
      canReopenCompletedFactFind({
        status: "completed",
        sessionType: "fact-find",
        requestedType: "fact-find",
        hasMessage: true,
      }),
    ).toBe(true);
  });

  it("leaves an active session on the normal path", () => {
    expect(
      canReopenCompletedFactFind({
        status: "active",
        sessionType: "fact-find",
        requestedType: "fact-find",
        hasMessage: true,
      }),
    ).toBe(false);
  });

  it("does not reopen an abandoned fact-find or a closed review", () => {
    expect(
      canReopenCompletedFactFind({
        status: "abandoned",
        sessionType: "fact-find",
        requestedType: "fact-find",
        hasMessage: true,
      }),
    ).toBe(false);
    expect(
      canReopenCompletedFactFind({
        status: "completed",
        sessionType: "annual-review",
        requestedType: "annual-review",
        hasMessage: true,
      }),
    ).toBe(false);
    expect(
      canReopenCompletedFactFind({
        status: "completed",
        sessionType: "annual-review",
        requestedType: "fact-find",
        hasMessage: true,
      }),
    ).toBe(false);
  });

  it("does not reopen when the request has no message", () => {
    expect(
      canReopenCompletedFactFind({
        status: "completed",
        sessionType: "fact-find",
        requestedType: "fact-find",
        hasMessage: false,
      }),
    ).toBe(false);
  });
});

describe("fact-find correction prompt", () => {
  it("tells Charlie to ask what to change instead of closing again", () => {
    expect(FACT_FIND_SYSTEM_PROMPT).toContain(
      "do not wrap up in that reply",
    );
    expect(FACT_FIND_SYSTEM_PROMPT).toContain(
      "Ask which detail to change",
    );
  });
});
