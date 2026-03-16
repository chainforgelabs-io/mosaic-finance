const XAI_BASE = "https://api.x.ai/v1";
const API_KEY = process.env.XAI_API_KEY;
const DEFAULT_MODEL = "grok-4.1-fast";

export interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GrokTool {
  type: "function";
  function: {
    name: string;
    parameters?: Record<string, unknown>;
  };
}

interface GrokChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: GrokTool[];
  searchParameters?: {
    mode?: "auto" | "on" | "off";
    sources?: Array<{ type: "web" | "x" | "news" | "rss" }>;
    allowedDomains?: string[];
    excludedDomains?: string[];
    fromDate?: string;
    toDate?: string;
    maxResults?: number;
  };
}

interface GrokChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface GrokChatResponse {
  id: string;
  choices: GrokChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function grokChat(
  messages: GrokMessage[],
  options?: GrokChatOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options?.model ?? DEFAULT_MODEL,
    messages,
    max_tokens: options?.maxTokens ?? 2048,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.tools) {
    body.tools = options.tools;
  }

  if (options?.searchParameters) {
    body.search_parameters = options.searchParameters;
  }

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Grok API error ${res.status}: ${errorText}`);
  }

  const data: GrokChatResponse = await res.json();
  return data.choices[0]?.message?.content ?? "";
}
