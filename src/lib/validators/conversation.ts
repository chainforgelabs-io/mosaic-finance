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

export type ConversationMessageInput = z.infer<typeof ConversationMessageSchema>;
export type ConversationStartInput = z.infer<typeof ConversationStartSchema>;
