import { describe, expect, it } from "vitest";
import { claudeErrorMessage, claudeSamplingParams } from "@/lib/claude/client";

describe("claudeSamplingParams", () => {
  it("turns thinking off for Sonnet 5", () => {
    expect(claudeSamplingParams("claude-sonnet-5")).toEqual({
      thinking: { type: "disabled" },
    });
  });

  it("does not send thinking.type disabled to Sonnet 5.5", () => {
    expect(claudeSamplingParams("claude-sonnet-5.5")).toEqual({});
    expect(claudeSamplingParams("claude-sonnet-5-5")).toEqual({});
  });
});

describe("claudeErrorMessage", () => {
  it("uses a short fallback when the failure is not an API error", () => {
    expect(claudeErrorMessage(new Error("socket hang up"))).toBe(
      "Charlie could not reply. Please try again.",
    );
  });
});
