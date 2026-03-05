import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic } from '@/lib/claude/client';
import { FACT_FIND_SYSTEM_PROMPT } from '@/lib/claude/prompts/fact-find';
import { RISK_PROFILE_SYSTEM_PROMPT } from '@/lib/claude/prompts/risk-profile';
import { ConversationMessageSchema } from '@/lib/validators/conversation';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';
import { sanitizeUserInput } from '@/lib/security/sanitize';

const SYSTEM_PROMPTS: Record<string, string> = {
  'fact-find': FACT_FIND_SYSTEM_PROMPT,
  'risk-profile': RISK_PROFILE_SYSTEM_PROMPT,
};

const COMPLETION_TAGS: Record<string, RegExp> = {
  'fact-find': /<FACT_FIND_COMPLETE>([\s\S]*?)<\/FACT_FIND_COMPLETE>/,
  'risk-profile': /<RISK_PROFILE_COMPLETE>([\s\S]*?)<\/RISK_PROFILE_COMPLETE>/,
};

const STRIP_TAGS: Record<string, RegExp> = {
  'fact-find': /<FACT_FIND_COMPLETE>[\s\S]*?<\/FACT_FIND_COMPLETE>/,
  'risk-profile': /<RISK_PROFILE_COMPLETE>[\s\S]*?<\/RISK_PROFILE_COMPLETE>/,
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { success } = await ratelimit.conversation.limit(user.id);
  if (!success) {
    return new Response(
      'Rate limit exceeded. Please wait before sending another message.',
      { status: 429 },
    );
  }

  const parsed = ConversationMessageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sessionId, message, sessionType } = parsed.data;
  const sanitizedMessage = message ? sanitizeUserInput(message) : null;

  const { data: session } = await supabase
    .from('conversation_sessions')
    .select('id, session_type, status, metadata')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'active') {
    return Response.json(
      { error: 'Session is no longer active' },
      { status: 400 },
    );
  }

  if (sanitizedMessage) {
    await supabase.from('conversation_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: sanitizedMessage,
    });
  }

  const { data: messageHistory } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  let claudeMessages = (messageHistory || []).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  if (claudeMessages.length === 0) {
    claudeMessages = [{ role: 'user' as const, content: 'Please begin the conversation.' }];
  }

  const systemPrompt =
    SYSTEM_PROMPTS[sessionType] ?? SYSTEM_PROMPTS['fact-find'];

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages: claudeMessages,
        });

        response.on('text', (text) => {
          fullResponse += text;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'delta', text })}\n\n`,
            ),
          );
        });

        await response.finalMessage();

        let extractedData = null;
        let sessionStatus: 'active' | 'completed' = 'active';

        const completionPattern = COMPLETION_TAGS[sessionType];
        if (completionPattern) {
          const match = fullResponse.match(completionPattern);
          if (match) {
            try {
              extractedData = JSON.parse(match[1]);
              sessionStatus = 'completed';
            } catch {
              /* JSON parse failed — session stays active */
            }
          }
        }

        const stripPattern = STRIP_TAGS[sessionType];
        const cleanedResponse = stripPattern
          ? fullResponse.replace(stripPattern, '').trim()
          : fullResponse.trim();

        await supabase.from('conversation_messages').insert({
          session_id: sessionId,
          user_id: user.id,
          role: 'assistant',
          content: cleanedResponse,
        });

        await supabase
          .from('conversation_sessions')
          .update({
            status: sessionStatus,
            metadata: extractedData
              ? { ...session.metadata, extracted_data: extractedData }
              : session.metadata,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              sessionComplete: sessionStatus === 'completed',
              extractedData,
            })}\n\n`,
          ),
        );

        controller.close();
      } catch (error) {
        captureAPIError(error, {
          route: 'conversation/message',
          userId: user.id,
          sessionId,
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              message: 'Something went wrong. Please try again.',
            })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
