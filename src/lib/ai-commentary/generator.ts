import { claudeChat, type ClaudeModel } from "@/lib/claude/client";
import { grokChat } from "@/lib/grok/client";
import { createServiceClient } from "@/lib/supabase/service";
import { RAY_DALIO_PROMPT } from "./prompts/ray-dalio";
import { WARREN_BUFFETT_PROMPT } from "./prompts/warren-buffett";
import { CATHIE_WOOD_PROMPT } from "./prompts/cathie-wood";
import { HOWARD_MARKS_PROMPT } from "./prompts/howard-marks";
import { PETER_LYNCH_PROMPT } from "./prompts/peter-lynch";
import { CANADIAN_PERSPECTIVE_PROMPT } from "./prompts/canadian-perspective";
import type { PersonaSlug, InvestorCommentary } from "@/lib/market-data/types";

const PERSONA_PROMPTS: Record<PersonaSlug, string> = {
  ray_dalio: RAY_DALIO_PROMPT,
  warren_buffett: WARREN_BUFFETT_PROMPT,
  cathie_wood: CATHIE_WOOD_PROMPT,
  howard_marks: HOWARD_MARKS_PROMPT,
  peter_lynch: PETER_LYNCH_PROMPT,
  canadian_perspective: CANADIAN_PERSPECTIVE_PROMPT,
};

async function gatherMarketSignal(): Promise<string> {
  try {
    const response = await grokChat(
      [
        {
          role: "user",
          content: `Give me a comprehensive summary of today's financial markets. Include:
1. Major US and Canadian index movements (S&P 500, NASDAQ, TSX, DOW)
2. Key economic data releases or Fed/Bank of Canada announcements
3. Top trending stocks and why they're moving
4. Overall market sentiment on social media (X/Twitter)
5. Any breaking financial news

Be specific with numbers, percentages, and names. This will be used as input for market analysis.`,
        },
      ],
      {
        temperature: 0.3,
        maxTokens: 3000,
        searchParameters: {
          mode: "on",
          sources: [{ type: "web" }, { type: "x" }, { type: "news" }],
          maxResults: 20,
        },
      },
    );

    return response;
  } catch (error) {
    console.error("Failed to gather Grok market signal:", error);
    return "Unable to fetch real-time market data. Please analyze based on your general knowledge of recent market conditions.";
  }
}

export async function generateCommentary(
  persona: PersonaSlug,
  model: ClaudeModel = "sonnet",
): Promise<InvestorCommentary> {
  const systemPrompt = PERSONA_PROMPTS[persona];
  if (!systemPrompt) {
    throw new Error(`Unknown persona: ${persona}`);
  }

  const marketSignal = await gatherMarketSignal();

  const userMessage = `Here is today's market data and social sentiment to analyze:

${marketSignal}

Based on this information, provide your market assessment following the JSON format specified in your instructions.`;

  const response = await claudeChat(
    [{ role: "user", content: userMessage }],
    systemPrompt,
    {
      model,
      maxTokens: 4096,
      temperature: 0.7,
    },
  );

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = {
      outlook: "neutral",
      summary: response.slice(0, 1000),
      keyThemes: ["Market analysis in progress"],
      riskAssessment: "Unable to parse structured assessment.",
      actionableInsights: ["Check back for updated commentary."],
    };
  }

  const commentary: InvestorCommentary = {
    id: "",
    persona,
    modelUsed: model,
    outlook: (parsed.outlook as InvestorCommentary["outlook"]) || "neutral",
    summary: (parsed.summary as string) || "",
    keyThemes: (parsed.keyThemes as string[]) || [],
    riskAssessment: (parsed.riskAssessment as string) || "",
    actionableInsights: (parsed.actionableInsights as string[]) || [],
    generatedAt: new Date().toISOString(),
    period: "daily",
  };

  return commentary;
}

export async function generateAndStoreCommentary(
  persona: PersonaSlug,
  model: ClaudeModel = "sonnet",
): Promise<InvestorCommentary> {
  const commentary = await generateCommentary(persona, model);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ai_commentaries")
    .insert({
      persona,
      model_used: model,
      market_data_snapshot: { generatedAt: commentary.generatedAt },
      commentary: {
        outlook: commentary.outlook,
        summary: commentary.summary,
        keyThemes: commentary.keyThemes,
        riskAssessment: commentary.riskAssessment,
        actionableInsights: commentary.actionableInsights,
      },
      period: "daily",
    })
    .select()
    .single();

  if (error) throw error;

  return { ...commentary, id: data.id };
}

export async function generateAllCommentaries(
  model: ClaudeModel = "sonnet",
): Promise<InvestorCommentary[]> {
  const personas: PersonaSlug[] = [
    "ray_dalio",
    "warren_buffett",
    "cathie_wood",
    "howard_marks",
    "peter_lynch",
    "canadian_perspective",
  ];

  const results: InvestorCommentary[] = [];

  // Generate sequentially to avoid rate limits
  for (const persona of personas) {
    try {
      const commentary = await generateAndStoreCommentary(persona, model);
      results.push(commentary);
    } catch (error) {
      console.error(`Failed to generate commentary for ${persona}:`, error);
    }
  }

  return results;
}
