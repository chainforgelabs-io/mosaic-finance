import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const METADATA_MARKER = "\n---FINOVA_META---\n";
const METADATA_END = "\n---END_META---";

const FACT_FIND_SYSTEM_PROMPT = `You are Finova AI, a warm and professional financial planning assistant helping a Canadian user through their financial fact-find. Your job is to gather comprehensive financial information through natural conversation.

Topics to cover (gather meaningful detail on each):
1. INCOME — Employment income, other income sources, expected changes
2. EXPENSES — Monthly spending patterns, fixed vs variable costs
3. DEBTS — Mortgages, loans, credit cards, lines of credit
4. GOALS — Short-term and long-term financial goals
5. RETIREMENT — Timeline, desired lifestyle, pension/CPP expectations
6. INVESTMENTS — Current accounts (RRSP, TFSA, FHSA, non-registered), holdings
7. KNOWLEDGE — Investment experience, risk comfort, financial literacy level

Conversation guidelines:
- Start with a warm greeting and ask about income/employment first
- Ask 1-2 questions at a time, never overwhelm
- Acknowledge responses empathetically before continuing
- Use Canadian financial context naturally (RRSP, TFSA, FHSA, CPP, OAS)
- Never ask for sensitive info (SIN, bank account numbers, addresses)
- Keep responses to 2-4 sentences
- Flow naturally between topics based on what the user shares
- If the user gives incomplete info, gently probe for more detail
- After covering all topics, summarize what you've learned and ask for confirmation

IMPORTANT: At the end of EVERY response, on a new line, include metadata in this exact format:
---FINOVA_META---
{"topics":{"income":false,"expenses":false,"debts":false,"goals":false,"retirement":false,"investments":false,"knowledge":false},"complete":false}
---END_META---

Update each topic to true once you have gathered sufficient information on it.
When ALL topics are covered and you have confirmed with the user, set "complete" to true and add a "summary" field:
---FINOVA_META---
{"topics":{"income":true,"expenses":true,"debts":true,"goals":true,"retirement":true,"investments":true,"knowledge":true},"complete":true,"summary":{"monthly_income":"$X,XXX","annual_income":"$XX,XXX","monthly_expenses":"$X,XXX","total_debts":"$XX,XXX","financial_goals":["Goal 1","Goal 2"],"target_retirement_age":65,"current_investments":"$XX,XXX","knowledge_level":"beginner"}}
---END_META---

The metadata block is automatically stripped before showing to the user. Always include it.`;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { sessionId, message } = body as {
    sessionId: string;
    message?: string;
  };

  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const { data: existingMessages } = await supabase
    .from("conversation_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const conversationHistory: { role: "user" | "assistant"; content: string }[] =
    (existingMessages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  if (message) {
    conversationHistory.push({ role: "user", content: message });

    await supabase.from("conversation_messages").insert({
      session_id: sessionId,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: FACT_FIND_SYSTEM_PROMPT,
          messages: conversationHistory,
        });

        let fullResponse = "";
        let flushedUpTo = 0;

        anthropicStream.on("text", (text) => {
          fullResponse += text;

          const markerIdx = fullResponse.indexOf(METADATA_MARKER);

          if (markerIdx !== -1) {
            const visibleContent = fullResponse.slice(0, markerIdx);
            if (visibleContent.length > flushedUpTo) {
              const chunk = visibleContent.slice(flushedUpTo);
              controller.enqueue(
                encoder.encode(`event: token\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
              );
              flushedUpTo = visibleContent.length;
            }
            return;
          }

          const safeEnd = Math.max(
            flushedUpTo,
            fullResponse.length - METADATA_MARKER.length,
          );
          if (safeEnd > flushedUpTo) {
            const chunk = fullResponse.slice(flushedUpTo, safeEnd);
            controller.enqueue(
              encoder.encode(`event: token\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
            );
            flushedUpTo = safeEnd;
          }
        });

        await anthropicStream.finalMessage();

        const markerIdx = fullResponse.indexOf(METADATA_MARKER);
        let visibleContent = fullResponse;
        let metadata: {
          topics?: Record<string, boolean>;
          complete?: boolean;
          summary?: Record<string, unknown>;
        } | null = null;

        if (markerIdx !== -1) {
          visibleContent = fullResponse.slice(0, markerIdx);
          const metaEndIdx = fullResponse.indexOf(METADATA_END);
          const metaStr = fullResponse.slice(
            markerIdx + METADATA_MARKER.length,
            metaEndIdx !== -1 ? metaEndIdx : undefined,
          );
          try {
            metadata = JSON.parse(metaStr.trim());
          } catch {
            // metadata parse failed — non-critical
          }
        }

        if (visibleContent.length > flushedUpTo) {
          const remaining = visibleContent.slice(flushedUpTo);
          controller.enqueue(
            encoder.encode(`event: token\ndata: ${JSON.stringify({ content: remaining })}\n\n`),
          );
        }

        await supabase.from("conversation_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: visibleContent.trim(),
          created_at: new Date().toISOString(),
        });

        if (metadata?.topics) {
          controller.enqueue(
            encoder.encode(
              `event: topics\ndata: ${JSON.stringify(metadata.topics)}\n\n`,
            ),
          );
        }

        const isComplete = metadata?.complete === true;

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              sessionComplete: isComplete,
              ...(isComplete && metadata?.summary
                ? { summary: metadata.summary }
                : {}),
            })}\n\n`,
          ),
        );

        if (isComplete) {
          await supabase
            .from("conversation_sessions")
            .update({
              status: "completed",
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
        } else {
          await supabase
            .from("conversation_sessions")
            .update({ last_activity_at: new Date().toISOString() })
            .eq("id", sessionId);
        }

        controller.close();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: errorMessage })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
