import { claudeChat } from "@/lib/claude/client";
import { createServiceClient } from "@/lib/supabase/service";
import { getPersona } from "@/lib/ai-commentary/personas";
import type { PersonaSlug } from "@/lib/market-data/types";
import type { RawSignal, TickerPersonaTake, TickerSignal } from "@/types/picks";

/** Mixed-style default panel for automatic enrichment. */
export const DEFAULT_TAKE_PERSONAS: PersonaSlug[] = [
  "warren_buffett",
  "ray_dalio",
  "cathie_wood",
  "jesse_livermore",
];

const TAKE_TTL_HOURS = 24;

function buildSystemPrompt(persona: PersonaSlug): string {
  const p = getPersona(persona);
  if (!p) throw new Error(`Unknown persona: ${persona}`);
  return `You are an AI channeling the investment philosophy of ${p.name} (${p.title}).

Philosophy: ${p.philosophySummary}
Strategy: ${p.strategySummary}

You will receive data about a single stock that is trending across social, news, congressional-trading, and market signals. Assess it strictly through this investor's lens — including being dismissive or skeptical where this investor would be.

Respond with ONLY a JSON object:
{
  "outlook": "very_bullish" | "bullish" | "neutral" | "bearish" | "very_bearish",
  "summary": "3-4 sentence assessment in this investor's voice",
  "keyPoints": ["3-5 short bullet points covering valuation/trend/risk as this investor would frame them"]
}`;
}

function buildTickerContext(
  signal: TickerSignal | null,
  recent: RawSignal[],
): string {
  const lines: string[] = [];
  if (signal) {
    lines.push(
      `Ticker: ${signal.ticker}${signal.name ? ` (${signal.name})` : ""}`,
      `Sector: ${signal.sector || "unknown"}`,
      `Price: ${signal.last_price ?? "n/a"} (${signal.last_change_pct ?? "n/a"}% 1d)`,
      `Mentions 24h: ${signal.mention_count_24h ?? 0} (tracked alpha accounts: ${signal.tracked_account_mentions_24h ?? 0}, broad X: ${signal.firehose_mentions_24h ?? 0})`,
      `Congress 30d: ${signal.congress_buys_30d ?? 0} buys / ${signal.congress_sells_30d ?? 0} sells`,
      `Avg sentiment 24h: ${signal.avg_sentiment_24h ?? "n/a"} (-1 bearish to +1 bullish)`,
      `Composite signal score: ${signal.composite_score ?? "n/a"}/100${signal.under_the_radar ? " — flagged UNDER THE RADAR" : ""}${signal.big_mover ? " — flagged BIG MOVER" : ""}`,
    );
  }
  if (recent.length > 0) {
    lines.push("", "Recent signals driving this:");
    for (const r of recent.slice(0, 10)) {
      const who = r.author_handle ? ` @${r.author_handle}` : "";
      lines.push(`- [${r.source}${who}] ${(r.content || "").slice(0, 280)}`);
    }
  }
  return lines.join("\n");
}

export async function generateTickerTake(
  ticker: string,
  persona: PersonaSlug,
): Promise<TickerPersonaTake> {
  const supabase = createServiceClient();

  const [signalRes, recentRes] = await Promise.all([
    supabase.from("ticker_signals").select("*").eq("ticker", ticker).maybeSingle(),
    supabase
      .from("raw_signals")
      .select("*")
      .eq("ticker", ticker)
      .order("occurred_at", { ascending: false })
      .limit(10),
  ]);

  const context = buildTickerContext(
    (signalRes.data as TickerSignal | null) ?? null,
    (recentRes.data || []) as RawSignal[],
  );

  const response = await claudeChat(
    [
      {
        role: "user",
        content: `Assess this stock based on the following signal data:\n\n${context}\n\nReturn the JSON assessment.`,
      },
    ],
    buildSystemPrompt(persona),
    { model: "sonnet", maxTokens: 1500, temperature: 0.7 },
  );

  let parsed: Record<string, unknown>;
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    parsed = JSON.parse(match[0]);
  } catch {
    parsed = {
      outlook: "neutral",
      summary: response.slice(0, 600),
      keyPoints: [],
    };
  }

  const validOutlooks = [
    "very_bullish",
    "bullish",
    "neutral",
    "bearish",
    "very_bearish",
  ];
  const outlook = validOutlooks.includes(parsed.outlook as string)
    ? (parsed.outlook as TickerPersonaTake["outlook"])
    : "neutral";

  const now = new Date();
  const row = {
    ticker,
    persona,
    outlook,
    summary: (parsed.summary as string) || "",
    key_points: Array.isArray(parsed.keyPoints)
      ? (parsed.keyPoints as string[]).slice(0, 6)
      : [],
    generated_at: now.toISOString(),
    expires_at: new Date(now.getTime() + TAKE_TTL_HOURS * 3600_000).toISOString(),
  };

  const { data, error } = await supabase
    .from("ticker_persona_takes")
    .upsert(row, { onConflict: "ticker,persona" })
    .select()
    .single();

  if (error) throw error;
  return data as TickerPersonaTake;
}

/** Generate the default persona panel for a ticker (sequential — rate limits). */
export async function generateTakesForTicker(
  ticker: string,
  personas: PersonaSlug[] = DEFAULT_TAKE_PERSONAS,
): Promise<TickerPersonaTake[]> {
  const takes: TickerPersonaTake[] = [];
  for (const persona of personas) {
    try {
      takes.push(await generateTickerTake(ticker, persona));
    } catch (err) {
      console.error(`persona take failed for ${ticker}/${persona}:`, err);
    }
  }
  return takes;
}

/** Nightly enrichment: refresh takes for the top-N composite-score tickers. */
export async function enrichTopTickers(topN: number): Promise<{
  tickersEnriched: string[];
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  const { data, error } = await supabase
    .from("ticker_signals")
    .select("ticker")
    .order("composite_score", { ascending: false, nullsFirst: false })
    .limit(topN);
  if (error) throw error;

  const tickersEnriched: string[] = [];
  for (const row of data || []) {
    try {
      await generateTakesForTicker(row.ticker);
      tickersEnriched.push(row.ticker);
    } catch (err) {
      errors.push(
        `${row.ticker}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }
  return { tickersEnriched, errors };
}
