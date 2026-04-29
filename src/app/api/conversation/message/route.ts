import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claudeStream } from '@/lib/claude/client';
import { FACT_FIND_SYSTEM_PROMPT } from '@/lib/claude/prompts/fact-find';
import { RISK_PROFILE_SYSTEM_PROMPT } from '@/lib/claude/prompts/risk-profile';
import { ANNUAL_REVIEW_SYSTEM_PROMPT } from '@/lib/claude/prompts/annual-review';
import { AD_HOC_SYSTEM_PROMPT } from '@/lib/claude/prompts/ad-hoc';
import { buildKnowledgeContext, type UserProfileFlags, type ConversationStage } from '@/lib/knowledge/loader';
import { ConversationMessageSchema } from '@/lib/validators/conversation';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';
import { sanitizeUserInput } from '@/lib/security/sanitize';
import { buildClientSnapshot } from '@/lib/conversation/snapshot';

const SESSION_TYPE_CONFIG: Record<string, {
  prompt: string;
  completionTag: RegExp;
  stripTag: RegExp;
  tagOpen: string;
  knowledgeStage: ConversationStage;
}> = {
  'fact-find': {
    prompt: FACT_FIND_SYSTEM_PROMPT,
    completionTag: /<FACT_FIND_COMPLETE>([\s\S]*?)<\/FACT_FIND_COMPLETE>/,
    stripTag: /<FACT_FIND_COMPLETE>[\s\S]*?<\/FACT_FIND_COMPLETE>/,
    tagOpen: '<FACT_FIND_COMPLETE>',
    knowledgeStage: 'fact-find',
  },
  'risk-profile': {
    prompt: RISK_PROFILE_SYSTEM_PROMPT,
    completionTag: /<RISK_PROFILE_COMPLETE>([\s\S]*?)<\/RISK_PROFILE_COMPLETE>/,
    stripTag: /<RISK_PROFILE_COMPLETE>[\s\S]*?<\/RISK_PROFILE_COMPLETE>/,
    tagOpen: '<RISK_PROFILE_COMPLETE>',
    knowledgeStage: 'risk-assessment',
  },
  'annual-review': {
    prompt: ANNUAL_REVIEW_SYSTEM_PROMPT,
    completionTag: /<REVIEW_COMPLETE>([\s\S]*?)<\/REVIEW_COMPLETE>/,
    stripTag: /<REVIEW_COMPLETE>[\s\S]*?<\/REVIEW_COMPLETE>/,
    tagOpen: '<REVIEW_COMPLETE>',
    knowledgeStage: 'annual-review',
  },
  'ad-hoc': {
    prompt: AD_HOC_SYSTEM_PROMPT,
    completionTag: /(?!)/, // no completion tag for ad-hoc
    stripTag: /(?!)/,
    tagOpen: '',
    knowledgeStage: 'ad-hoc',
  },
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

  // Build system prompt based on session type
  const config = SESSION_TYPE_CONFIG[sessionType] ?? SESSION_TYPE_CONFIG['fact-find'];
  let systemPrompt = config.prompt;

  // Fetch user profile for context injection
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('alias, age, sex, annual_income, province, employment_type, occupation, family_structure')
    .eq('id', user.id)
    .single();

  // Fetch household members
  const { data: householdMembers } = await supabase
    .from('household_members')
    .select('relationship, age, sex, occupation, annual_income, is_dependant')
    .eq('user_id', user.id);

  // Build user profile flags for knowledge module injection
  const userFlags: UserProfileFlags = {};

  if (profile) {
    if (profile.employment_type === 'self-employed') userFlags.isSelfEmployed = true;

    const profileContext: string[] = [];
    if (profile.alias) profileContext.push(`Name/alias: ${profile.alias}`);
    if (profile.age) profileContext.push(`Age: ${profile.age}`);
    if (profile.sex) profileContext.push(`Sex: ${profile.sex}`);
    if (profile.annual_income) profileContext.push(`Annual income: $${Number(profile.annual_income).toLocaleString()}`);
    if (profile.province) profileContext.push(`Province: ${profile.province}`);
    if (profile.employment_type) profileContext.push(`Employment: ${profile.employment_type}`);
    if (profile.occupation) profileContext.push(`Occupation: ${profile.occupation}`);
    if (profile.family_structure) profileContext.push(`Family: ${profile.family_structure}`);

    if (householdMembers && householdMembers.length > 0) {
      profileContext.push(`\nHousehold members:`);
      for (const member of householdMembers) {
        const parts = [`  - ${member.relationship}`];
        if (member.age) parts.push(`age ${member.age}`);
        if (member.sex) parts.push(`${member.sex}`);
        if (member.occupation) parts.push(`${member.occupation}`);
        if (member.annual_income) parts.push(`income $${Number(member.annual_income).toLocaleString()}`);
        if (member.is_dependant) parts.push(`(dependant)`);
        profileContext.push(parts.join(', '));
      }
      userFlags.isDivorced = false; // has household members, probably not divorced
    }

    if (profileContext.length > 0) {
      systemPrompt += `\n\nCLIENT PROFILE (already collected — do NOT re-ask these):\n${profileContext.join('\n')}\n\nUse this information naturally. Greet them by name if available. Skip questions about information you already have — move straight to what you don't know yet.`;
    }
  }

  // Check for detected flags from a previous fact-find session
  if (sessionType !== 'fact-find') {
    const { data: factFindSession } = await supabase
      .from('conversation_sessions')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('session_type', 'fact-find')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (factFindSession?.metadata) {
      const meta = factFindSession.metadata as Record<string, unknown>;
      const extracted = meta.extracted_data as Record<string, unknown> | undefined;
      if (extracted?.detected_flags) {
        const flags = extracted.detected_flags as Record<string, boolean>;
        if (flags.is_divorced_or_separated) userFlags.isDivorced = true;
        if (flags.is_business_owner) userFlags.isBusinessOwner = true;
        if (flags.is_self_employed) userFlags.isSelfEmployed = true;
        if (flags.has_us_property) userFlags.hasUSProperty = true;
        if (flags.has_us_income) userFlags.hasUSIncome = true;
        if (flags.is_snowbird) userFlags.isSnowbird = true;
      }
    }
  }

  // Inject knowledge modules
  const knowledgeContext = buildKnowledgeContext(config.knowledgeStage, userFlags);
  if (knowledgeContext) {
    systemPrompt += knowledgeContext;
  }

  // Full financial snapshot (ad-hoc + annual-review only; cached per session)
  if (sessionType === 'ad-hoc' || sessionType === 'annual-review') {
    const meta =
      session.metadata && typeof session.metadata === 'object'
        ? (session.metadata as Record<string, unknown>)
        : {};
    let snapshot =
      typeof meta.snapshot_text === 'string' && meta.snapshot_text.length > 0
        ? meta.snapshot_text
        : '';
    if (!snapshot) {
      snapshot = await buildClientSnapshot(supabase, user.id);
      if (snapshot) {
        const nextMeta = {
          ...meta,
          snapshot_text: snapshot,
          snapshot_cached_at: new Date().toISOString(),
        };
        await supabase
          .from('conversation_sessions')
          .update({ metadata: nextMeta })
          .eq('id', sessionId);
      }
    }
    if (snapshot) {
      systemPrompt += `\n\n${snapshot}\n\nUse this snapshot as ground truth when it conflicts with vague client phrasing. Quote specific balances and rates from the snapshot when relevant.`;
    }
  }

  const TAG_OPEN = config.tagOpen;
  const TOPICS_TAG_OPEN = '<TOPICS_COVERED>';
  const encoder = new TextEncoder();
  let fullResponse = '';
  let flushedUpTo = 0;

  /** While streaming: hold back a suffix in case a completion/topics tag is still forming. */
  function getVisibleEnd(fr: string): number {
    let end = fr.length;
    if (TAG_OPEN) {
      const i = fr.indexOf(TAG_OPEN);
      if (i !== -1) {
        end = Math.min(end, i);
      } else {
        end = Math.min(end, Math.max(0, fr.length - TAG_OPEN.length));
      }
    }
    if (sessionType === 'fact-find') {
      const i = fr.indexOf(TOPICS_TAG_OPEN);
      if (i !== -1) {
        end = Math.min(end, i);
      } else {
        end = Math.min(end, Math.max(0, fr.length - TOPICS_TAG_OPEN.length));
      }
    }
    return end;
  }

  /** After the model stream completes: do not hold back characters — only cut at actual tag starts. */
  function getFinalVisibleEnd(fr: string): number {
    let end = fr.length;
    if (TAG_OPEN) {
      const i = fr.indexOf(TAG_OPEN);
      if (i !== -1) end = Math.min(end, i);
    }
    if (sessionType === 'fact-find') {
      const i = fr.indexOf(TOPICS_TAG_OPEN);
      if (i !== -1) end = Math.min(end, i);
    }
    return end;
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = claudeStream(
          claudeMessages,
          systemPrompt,
        );

        response.on('text', (text) => {
          fullResponse += text;

          if (TAG_OPEN || sessionType === 'fact-find') {
            const visibleEnd = getVisibleEnd(fullResponse);
            if (visibleEnd > flushedUpTo) {
              const chunk = fullResponse.slice(flushedUpTo, visibleEnd);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`,
                ),
              );
              flushedUpTo = visibleEnd;
            }
          } else {
            // No tag to buffer — stream everything
            const chunk = fullResponse.slice(flushedUpTo);
            if (chunk) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`,
                ),
              );
              flushedUpTo = fullResponse.length;
            }
          }
        });

        await response.finalMessage();

        // Flush remaining visible text (use getFinalVisibleEnd so we never drop the tail when no tag appears)
        if (TAG_OPEN || sessionType === 'fact-find') {
          const visibleEnd = getFinalVisibleEnd(fullResponse);
          if (flushedUpTo < visibleEnd) {
            const remaining = fullResponse.slice(flushedUpTo, visibleEnd);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'delta', text: remaining })}\n\n`,
              ),
            );
            flushedUpTo = visibleEnd;
          }
        } else if (flushedUpTo < fullResponse.length) {
          const remaining = fullResponse.slice(flushedUpTo);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'delta', text: remaining })}\n\n`,
            ),
          );
        }

        let extractedData = null;
        let sessionStatus: 'active' | 'completed' = 'active';

        const completionPattern = config.completionTag;
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

        const stripPattern = config.stripTag;
        const TOPICS_STRIP = /<TOPICS_COVERED>[\s\S]*?<\/TOPICS_COVERED>/g;
        let cleanedResponse = fullResponse.trim();
        if (stripPattern) {
          cleanedResponse = cleanedResponse.replace(stripPattern, '');
        }
        cleanedResponse = cleanedResponse.replace(TOPICS_STRIP, '').trim();

        const topicsMatch = fullResponse.match(/<TOPICS_COVERED>([\s\S]*?)<\/TOPICS_COVERED>/);
        let topicsCovered: string[] | null = null;
        if (topicsMatch) {
          try {
            const parsed = JSON.parse(topicsMatch[1].trim());
            if (Array.isArray(parsed)) {
              topicsCovered = parsed.filter((x): x is string => typeof x === 'string');
            }
          } catch {
            /* invalid JSON */
          }
        }

        if (cleanedResponse) {
          await supabase.from('conversation_messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: cleanedResponse,
          });
        }

        const { data: latestSession } = await supabase
          .from('conversation_sessions')
          .select('metadata')
          .eq('id', sessionId)
          .single();

        const baseMeta =
          latestSession?.metadata && typeof latestSession.metadata === 'object'
            ? (latestSession.metadata as Record<string, unknown>)
            : {};
        const nextMetadata = extractedData
          ? { ...baseMeta, extracted_data: extractedData }
          : baseMeta;

        await supabase
          .from('conversation_sessions')
          .update({
            status: sessionStatus,
            metadata: nextMetadata,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              sessionComplete: sessionStatus === 'completed',
              extractedData,
              topicsCovered,
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
