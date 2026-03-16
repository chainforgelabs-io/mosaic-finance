import Anthropic from "@anthropic-ai/sdk";
import { captureAPIError } from "@/lib/sentry";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 120_000,
  maxRetries: 0,
});

export type ClaudeModel = "opus" | "sonnet";

interface ClaudeChatOptions {
  maxTokens?: number;
  temperature?: number;
  model?: ClaudeModel;
  /** Per-request timeout in ms — overrides the default 120s SDK timeout. */
  timeout?: number;
}

const MODEL_IDS: Record<ClaudeModel, string> = {
  opus: "claude-opus-4-20250918",
  sonnet: "claude-sonnet-4-5-20250929",
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

/**
 * Send a chat to Claude with automatic model selection and retry logic.
 * Opus is used for plan generation and walkthrough (complex financial reasoning).
 * Sonnet is used for fact-find, risk-profile, and market context (speed-sensitive).
 */
export async function claudeChat(
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
  options?: ClaudeChatOptions
): Promise<string> {
  const model = options?.model ?? "sonnet";
  const modelId = MODEL_IDS[model];

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
          system: systemPrompt,
          messages,
        },
        requestOpts,
      );

      if (response.stop_reason === "max_tokens") {
        const partial = response.content[0];
        const text = partial?.type === "text" ? partial.text : "";
        throw new ClaudeTruncationError(text.length);
      }

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
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
  options?: ClaudeChatOptions
): Promise<string> {
  const model = options?.model ?? "sonnet";
  const modelId = MODEL_IDS[model];

  const stream = anthropic.messages.stream({
    model: modelId,
    max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options?.temperature,
    system: systemPrompt,
    messages,
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "max_tokens") {
    const partial = response.content[0];
    const text = partial?.type === "text" ? partial.text : "";
    throw new ClaudeTruncationError(text.length);
  }

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

/**
 * Create a streaming chat for real-time conversational UX (SSE).
 * Returns the Anthropic stream object for event-based consumption.
 */
export function claudeStream(
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
  options?: ClaudeChatOptions
) {
  const model = options?.model ?? "sonnet";
  const modelId = MODEL_IDS[model];

  return anthropic.messages.stream({
    model: modelId,
    max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options?.temperature,
    system: systemPrompt,
    messages,
  });
}

export { anthropic };
