import Anthropic from "@anthropic-ai/sdk";
import { captureAPIError } from "@/lib/sentry";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 120_000,
  maxRetries: 0,
});

export type ClaudeModel = "opus" | "sonnet";

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  modelId: string;
}

interface ClaudeChatOptions {
  maxTokens?: number;
  temperature?: number;
  model?: ClaudeModel;
  /** Per-request timeout in ms — overrides the default 120s SDK timeout. */
  timeout?: number;
  cacheSystem?: boolean;
  onUsage?: (usage: ClaudeUsage) => void | Promise<void>;
}

const DEFAULT_SONNET =
  process.env.CLAUDE_MODEL_SONNET ?? "claude-sonnet-4-5-20250929";
const DEFAULT_OPUS = process.env.CLAUDE_MODEL_OPUS ?? DEFAULT_SONNET;

const MODEL_IDS: Record<ClaudeModel, string> = {
  opus: DEFAULT_OPUS,
  sonnet: DEFAULT_SONNET,
};

const DEFAULT_MAX_TOKENS = 4096;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class ClaudeTruncationError extends Error {
  constructor(public partialLength: number) {
    super(
      `Response truncated at ${partialLength} chars — max_tokens too low for this request`,
    );
    this.name = "ClaudeTruncationError";
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return (
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 529
    );
  }
  if (error instanceof Error && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

function getRetryDelay(attempt: number, error: unknown): number {
  if (error instanceof Anthropic.APIError && error.status === 429) {
    const retryAfter = error.headers?.["retry-after"];
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000;
    }
  }
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
}

function cachedSystem(systemPrompt: string, cacheSystem: boolean) {
  if (!cacheSystem) return systemPrompt;
  return [
    {
      type: "text" as const,
      text: systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function cachedMessages(messages: ChatMessage[], cacheSystem: boolean) {
  if (!cacheSystem || messages.length === 0) return messages;
  const cacheIndex = messages.length >= 2 ? messages.length - 2 : 0;
  return messages.map((m, i) => {
    if (i !== cacheIndex) return m;
    return {
      role: m.role,
      content: [
        {
          type: "text" as const,
          text: m.content,
          cache_control: { type: "ephemeral" as const },
        },
      ],
    };
  });
}

function usageFromMessage(
  response: {
    usage?: {
      input_tokens?: number | null;
      output_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    };
  },
  modelId: string,
): ClaudeUsage {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
    modelId,
  };
}

/**
 * Send a chat to Claude with automatic model selection and retry logic.
 * Opus is used for plan generation and walkthrough (complex financial reasoning).
 * Sonnet is used for fact-find, risk-profile, and market context (speed-sensitive).
 */
export async function claudeChat(
  messages: ChatMessage[],
  systemPrompt: string,
  options?: ClaudeChatOptions
): Promise<string> {
  const model = options?.model ?? "sonnet";
  const modelId = MODEL_IDS[model];
  const cacheSystem = options?.cacheSystem ?? true;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const requestOpts = options?.timeout
        ? { timeout: options.timeout }
        : undefined;

      const response = await anthropic.messages.create(
        {
          model: modelId,
          max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: options?.temperature,
          system: cachedSystem(systemPrompt, cacheSystem),
          messages: cachedMessages(messages, cacheSystem),
        },
        requestOpts,
      );

      if (response.stop_reason === "max_tokens") {
        const partial = response.content[0];
        const text = partial?.type === "text" ? partial.text : "";
        throw new ClaudeTruncationError(text.length);
      }

      await options?.onUsage?.(usageFromMessage(response, modelId));

      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    } catch (error) {
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        const delay = getRetryDelay(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      captureAPIError(error, {
        module: "claude/client",
        model: modelId,
        attempt,
        messageCount: messages.length,
      });
      throw error;
    }
  }

  throw new Error("Claude chat failed after all retry attempts");
}

/**
 * Streaming variant of claudeChat — collects the full response via SSE so the
 * HTTP connection stays alive for long-running generations (plan generation).
 * Avoids timeout issues because tokens flow continuously.
 */
export async function claudeChatStreaming(
  messages: ChatMessage[],
  systemPrompt: string,
  options?: ClaudeChatOptions
): Promise<string> {
  const model = options?.model ?? "sonnet";
  const modelId = MODEL_IDS[model];
  const cacheSystem = options?.cacheSystem ?? true;

  const stream = anthropic.messages.stream({
    model: modelId,
    max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options?.temperature,
    system: cachedSystem(systemPrompt, cacheSystem),
    messages: cachedMessages(messages, cacheSystem),
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "max_tokens") {
    const partial = response.content[0];
    const text = partial?.type === "text" ? partial.text : "";
    throw new ClaudeTruncationError(text.length);
  }

  await options?.onUsage?.(usageFromMessage(response, modelId));

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

/**
 * Create a streaming chat for real-time conversational UX (SSE).
 * Returns the Anthropic stream object for event-based consumption.
 */
export function claudeStream(
  messages: ChatMessage[],
  systemPrompt: string,
  options?: ClaudeChatOptions
) {
  const model = options?.model ?? "sonnet";
  const modelId = MODEL_IDS[model];
  const cacheSystem = options?.cacheSystem ?? true;

  return anthropic.messages.stream({
    model: modelId,
    max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options?.temperature,
    system: cachedSystem(systemPrompt, cacheSystem),
    messages: cachedMessages(messages, cacheSystem),
  });
}

export { anthropic, MODEL_IDS };
