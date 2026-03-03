import { z } from "zod";

export const ConversationMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  sessionType: z.enum(["fact-find", "risk-profile", "walkthrough", "followup"]),
});

export const ConversationStartSchema = z.object({
  sessionType: z.enum(['fact-find', 'risk-profile', 'walkthrough', 'followup']),
});

export type ConversationMessageInput = z.infer<typeof ConversationMessageSchema>;
export type ConversationStartInput = z.infer<typeof ConversationStartSchema>;
