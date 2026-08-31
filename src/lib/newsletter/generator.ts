import { createServiceClient } from "@/lib/supabase/service";
import { getQuotes, getMarketMovers, DEFAULT_INDICES } from "@/lib/market-data/market-aggregator";
import { claudeChat } from "@/lib/claude/client";
import { resend } from "@/lib/resend/client";
import type { MarketMover } from "@/lib/market-data/types";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "plans@mosaicfinance.ai";

interface NewsletterContent {
  marketRecap: string;
  topMovers: { gainers: MarketMover[]; losers: MarketMover[] };
  newsSummary: string;
  aiHighlights: string[];
  weekStart: string;
  weekEnd: string;
}

async function gatherWeeklyData(): Promise<NewsletterContent> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekStart = weekAgo.toISOString().split("T")[0];
  const weekEnd = now.toISOString().split("T")[0];

  const [quotes, movers] = await Promise.allSettled([
    getQuotes(DEFAULT_INDICES.map((i) => i.symbol)),
    getMarketMovers(),
  ]);

  const indexSummary =
    quotes.status === "fulfilled"
      ? quotes.value
          .map(
            (q) =>
              `${q.symbol}: $${q.price.toFixed(2)} (${q.change > 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`,
          )
          .join("\n")
      : "Market data unavailable";

  const topMovers =
    movers.status === "fulfilled"
      ? movers.value
      : { gainers: [], losers: [] };

  // Pull AI commentary highlights from the week
  const supabase = createServiceClient();
  const { data: commentaries } = await supabase
    .from("ai_commentaries")
    .select("persona, commentary")
    .gte("generated_at", weekAgo.toISOString())
    .order("generated_at", { ascending: false })
    .limit(6);

  const aiHighlights = (commentaries || []).map((c) => {
    const content = c.commentary as Record<string, unknown>;
    return `${c.persona}: ${(content.summary as string)?.slice(0, 200) || "No summary"}`;
  });

  // Generate market recap via Claude
  const recapPrompt = `You are a financial newsletter writer. Write a concise weekly market recap (3-4 paragraphs) based on this data:

Market Indices (current):
${indexSummary}

Top Gainers this week:
${topMovers.gainers.slice(0, 5).map((m) => `${m.symbol}: +${m.changePercent.toFixed(2)}%`).join("\n") || "Data unavailable"}

Top Losers this week:
${topMovers.losers.slice(0, 5).map((m) => `${m.symbol}: ${m.changePercent.toFixed(2)}%`).join("\n") || "Data unavailable"}

Write in a professional but accessible tone. Cover both US and Canadian markets. Include what drove the major moves. End with a forward-looking sentence about what to watch next week.`;

  let marketRecap: string;
  try {
    marketRecap = await claudeChat(
      [{ role: "user", content: recapPrompt }],
      "You are a professional financial newsletter writer for a Canadian fintech platform.",
      { model: "sonnet", maxTokens: 2048, temperature: 0.6 },
    );
  } catch {
    marketRecap = `Weekly Market Recap (${weekStart} to ${weekEnd})\n\n${indexSummary}`;
  }

  // Generate news summary
  const newsSummary = `Key developments from the week of ${weekStart} to ${weekEnd}. Check the News tab for full coverage.`;

  return {
    marketRecap,
    topMovers,
    newsSummary,
    aiHighlights,
    weekStart,
    weekEnd,
  };
}

function buildNewsletterHtml(content: NewsletterContent): string {
  const gainersHtml = content.topMovers.gainers
    .slice(0, 5)
    .map(
      (m) =>
        `<tr><td style="padding:4px 12px;font-weight:600">${m.symbol}</td><td style="padding:4px 12px">${m.name}</td><td style="padding:4px 12px;color:#10B981;font-weight:600">+${m.changePercent.toFixed(2)}%</td></tr>`,
    )
    .join("");

  const losersHtml = content.topMovers.losers
    .slice(0, 5)
    .map(
      (m) =>
        `<tr><td style="padding:4px 12px;font-weight:600">${m.symbol}</td><td style="padding:4px 12px">${m.name}</td><td style="padding:4px 12px;color:#EF4444;font-weight:600">${m.changePercent.toFixed(2)}%</td></tr>`,
    )
    .join("");

  const aiHighlightsHtml = content.aiHighlights
    .map((h) => `<li style="margin-bottom:8px;color:#4B5563;font-size:14px">${h}</li>`)
    .join("");

  return `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#FAFAF8">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-block;line-height:0"><svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="rotate(45 16 16)"><rect x="8" y="8" width="8" height="8" fill="#10B981"/><rect x="16" y="8" width="8" height="8" fill="#1F2937"/><rect x="8" y="16" width="8" height="8" fill="#1F2937"/><rect x="16" y="16" width="8" height="8" fill="#10B981"/><rect x="14" y="14" width="4" height="4" fill="#EAB308"/></g></svg></div>
        <h1 style="margin:12px 0 4px;font-size:24px;color:#1F2937">Mosaic Finance Weekly Market Recap</h1>
        <p style="color:#9CA3AF;font-size:14px;margin:0">${content.weekStart} — ${content.weekEnd}</p>
      </div>

      <div style="background:white;border:1px solid #E8E8E0;border-radius:8px;padding:24px;margin-bottom:20px">
        <h2 style="font-size:16px;color:#0C0F17;margin:0 0 12px">Market Recap</h2>
        <div style="color:#4B5563;font-size:14px;line-height:1.7;white-space:pre-line">${content.marketRecap}</div>
      </div>

      ${
        gainersHtml
          ? `<div style="background:white;border:1px solid #E8E8E0;border-radius:8px;padding:24px;margin-bottom:20px">
        <h2 style="font-size:16px;color:#0C0F17;margin:0 0 12px">Top Movers</h2>
        <h3 style="font-size:13px;color:#10B981;margin:0 0 8px">Gainers</h3>
        <table style="width:100%;font-size:13px;color:#0C0F17;border-collapse:collapse">${gainersHtml}</table>
        <h3 style="font-size:13px;color:#EF4444;margin:16px 0 8px">Losers</h3>
        <table style="width:100%;font-size:13px;color:#0C0F17;border-collapse:collapse">${losersHtml}</table>
      </div>`
          : ""
      }

      ${
        aiHighlightsHtml
          ? `<div style="background:white;border:1px solid #E8E8E0;border-radius:8px;padding:24px;margin-bottom:20px">
        <h2 style="font-size:16px;color:#0C0F17;margin:0 0 12px">AI Commentary Highlights</h2>
        <ul style="padding-left:20px;margin:0">${aiHighlightsHtml}</ul>
      </div>`
          : ""
      }

      <div style="text-align:center;padding:20px 0;color:#9CA3AF;font-size:11px">
        <p>This newsletter is for educational context only. This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.</p>
        <p>Mosaic Finance · Financial tracking &amp; education</p>
      </div>
    </div>
  `;
}

export async function generateNewsletter(): Promise<{
  id: string;
  content: NewsletterContent;
}> {
  const content = await gatherWeeklyData();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("newsletter_editions")
    .insert({
      period_start: content.weekStart,
      period_end: content.weekEnd,
      content: {
        marketRecap: content.marketRecap,
        topMovers: content.topMovers,
        newsSummary: content.newsSummary,
        aiHighlights: content.aiHighlights,
      },
    })
    .select()
    .single();

  if (error) throw error;

  return { id: data.id, content };
}

export async function generateAndSendNewsletter(
  recipientEmails: string[],
): Promise<string> {
  const { id, content } = await generateNewsletter();

  const html = buildNewsletterHtml(content);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmails,
    subject: `Mosaic Finance Weekly Market Recap — ${content.weekStart} to ${content.weekEnd}`,
    html,
  });

  const supabase = createServiceClient();
  await supabase
    .from("newsletter_editions")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id);

  return id;
}
