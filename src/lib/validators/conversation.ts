import { z } from "zod";

export const ConversationMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  sessionType: z.enum(["fact-find", "risk-profile", "walkthrough", "followup"]),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
