const XAI_BASE = "https://api.x.ai/v1";
const API_KEY = process.env.XAI_API_KEY;
const DEFAULT_MODEL = "grok-3-fast-latest";

export interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type GrokSearchTool =
  | { type: "web_search"; allowed_domains?: string[]; excluded_domains?: string[] }
  | { type: "x_search"; allowed_x_handles?: string[]; excluded_x_handles?: string[]; from_date?: string; to_date?: string };

interface GrokChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: GrokSearchTool[];
}

interface GrokResponseOutput {
  type: string;
  text?: string;
  content?: Array<{ type: string; text?: string }>;
}

interface GrokResponseBody {
  id: string;
  output: GrokResponseOutput[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export async function grokChat(
  messages: GrokMessage[],
  options?: GrokChatOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options?.model ?? DEFAULT_MODEL,
    input: messages,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.maxTokens) {
    body.max_output_tokens = options.maxTokens;
  }

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }

  const res = await fetch(`${XAI_BASE}/responses`, {
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

  const data: GrokResponseBody = await res.json();

  for (const item of data.output) {
    if (item.type === "message" && item.content) {
      for (const block of item.content) {
        if (block.type === "output_text" && block.text) {
          return block.text;
        }
      }
    }
    if (item.type === "output_text" && item.text) {
      return item.text;
    }
  }

  return "";
}
