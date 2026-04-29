import { z } from "zod";

const SESSION_TYPES = [
  "fact-find",
  "risk-profile",
  "walkthrough",
  "followup",
  "annual-review",
  "ad-hoc",
] as const;

export const ConversationMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000).optional(),
  sessionType: z.enum(SESSION_TYPES),
});

export const ConversationStartSchema = z.object({
  sessionType: z.enum(SESSION_TYPES),
});

/** Body when the user confirms which annual-review updates to persist */
export const ApplyAnnualReviewBodySchema = z.object({
  /**
   * Map section id -> apply (true) or skip (false).
   * When omitted or empty, any non-empty section in `extracted` is applied.
   */
  apply: z.record(z.string(), z.boolean()).optional(),
  /** Edited structured payload (same shape as REVIEW_COMPLETE) */
  extracted: z.record(z.string(), z.unknown()),
});

export type ConversationMessageInput = z.infer<typeof ConversationMessageSchema>;
export type ConversationStartInput = z.infer<typeof ConversationStartSchema>;
export type ApplyAnnualReviewBody = z.infer<typeof ApplyAnnualReviewBodySchema>;

/** Valid risk_score values for risk_profiles insert */
export const RISK_SCORE_VALUES = [
  "conservative",
  "moderate-conservative",
  "balanced",
  "moderate-growth",
  "growth",
  "aggressive",
] as const;
