import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const RISK_PROBING_SYSTEM_PROMPT = `You are Finova AI, a warm and professional financial planning assistant. You're now conducting a brief follow-up conversation about the user's risk tolerance — how they actually feel about risk in practice, beyond questionnaire answers.

Your job:
- Ask 3–4 behavioral questions about risk in practice
- Be conversational and empathetic
- Reference real-world scenarios (market drops, unexpected expenses, etc.)
- Keep it brief — this is a follow-up, not a full conversation
- Keep responses to 2–3 sentences each

After gathering enough insight (typically 3–4 exchanges), wrap up and signal completion.

IMPORTANT: At the end of EVERY response, on a new line, include metadata in this exact format:
---FINOVA_META---
{"complete":false,"questionsAsked":1}
---END_META---

When you've gathered sufficient behavioral insight (after 3–4 questions), set "complete" to true and include a brief "insight" summary:
---FINOVA_META---
{"complete":true,"questionsAsked":4,"insight":"User shows balanced risk tolerance in theory but leans conservative in practice — prefers not to check portfolio during downturns and values stability over maximum returns."}
---END_META---

The metadata block is automatically stripped before showing to the user. Always include it.`;

const METADATA_MARKER = "\n---FINOVA_META---\n";
const METADATA_END = "\n---END_META---";

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
          max_tokens: 512,
          system: RISK_PROBING_SYSTEM_PROMPT,
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
                encoder.encode(
                  `event: token\ndata: ${JSON.stringify({ content: chunk })}\n\n`,
                ),
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
              encoder.encode(
                `event: token\ndata: ${JSON.stringify({ content: chunk })}\n\n`,
              ),
            );
            flushedUpTo = safeEnd;
          }
        });

        await anthropicStream.finalMessage();

        const markerIdx = fullResponse.indexOf(METADATA_MARKER);
        let visibleContent = fullResponse;
        let metadata: {
          complete?: boolean;
          questionsAsked?: number;
          insight?: string;
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
            encoder.encode(
              `event: token\ndata: ${JSON.stringify({ content: remaining })}\n\n`,
            ),
          );
        }

        await supabase.from("conversation_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: visibleContent.trim(),
          created_at: new Date().toISOString(),
        });

        const isComplete = metadata?.complete === true;

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              sessionComplete: isComplete,
              ...(isComplete && metadata?.insight
                ? { insight: metadata.insight }
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
