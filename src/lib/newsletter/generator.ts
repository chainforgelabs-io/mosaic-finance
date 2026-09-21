import { createServiceClient } from "@/lib/supabase/service";
import {
  getQuotes,
  getMarketMovers,
  DEFAULT_INDICES,
} from "@/lib/market-data/market-aggregator";
import { claudeChat } from "@/lib/claude/client";
import {
  mosaicCard,
  mosaicEmailHtml,
  escapeHtml,
} from "@/lib/email/chrome";
import { sendMosaicEmailEach } from "@/lib/email/send";
import { collectMarketRecipients } from "@/lib/email/recipients";
import {
  CANADIAN_WATCHLIST,
  filterLiquidMovers,
  percentCell,
  sanitizeRecap,
} from "@/lib/email/market-brief";
import type { MarketMover, Quote } from "@/lib/market-data/types";

interface NewsletterContent {
  marketRecap: string;
  indices: { symbol: string; name: string; changePercent: number }[];
  topMovers: { gainers: MarketMover[]; losers: MarketMover[] };
  canadianNames: { symbol: string; name: string; changePercent: number }[];
  weekStart: string;
  weekEnd: string;
}

function moverTable(rows: MarketMover[]): string {
  if (rows.length === 0) return "";
  const tr = rows
    .map((m) => {
      const cell = percentCell(m.changePercent);
      return `<tr>
        <td style="padding:6px 8px 6px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0C0F17;white-space:nowrap;">${escapeHtml(m.symbol)}</td>
        <td style="padding:6px 8px;font-family:Arial,sans-serif;font-size:13px;color:#4B5563;">${escapeHtml(m.name)}</td>
        <td style="padding:6px 0 6px 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${cell.color};text-align:right;white-space:nowrap;">${cell.text}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tr}</table>`;
}

function indexTable(
  rows: { symbol: string; name: string; changePercent: number }[],
): string {
  if (rows.length === 0) return "";
  const tr = rows
    .map((m) => {
      const cell = percentCell(m.changePercent);
      return `<tr>
        <td style="padding:6px 8px 6px 0;font-family:Arial,sans-serif;font-size:13px;color:#4B5563;">${escapeHtml(m.name)}</td>
        <td style="padding:6px 0 6px 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${cell.color};text-align:right;white-space:nowrap;">${cell.text}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tr}</table>`;
}

function quoteChange(
  quotes: Quote[],
  symbol: string,
): number | null {
  const q = quotes.find((x) => x.symbol === symbol);
  if (!q || !Number.isFinite(q.changePercent)) return null;
  return q.changePercent;
}

async function gatherWeeklyData(): Promise<NewsletterContent> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekStart = weekAgo.toISOString().split("T")[0] ?? "";
  const weekEnd = now.toISOString().split("T")[0] ?? "";

  const watchSymbols = CANADIAN_WATCHLIST.map((i) => i.symbol);
  const indexSymbols = DEFAULT_INDICES.map((i) => i.symbol);

  const [quotes, movers] = await Promise.allSettled([
    getQuotes([...new Set([...indexSymbols, ...watchSymbols])]),
    getMarketMovers(),
  ]);

  const quoteList = quotes.status === "fulfilled" ? quotes.value : [];
  const indexName: Record<string, string> = Object.fromEntries(
    DEFAULT_INDICES.map((i) => [i.symbol, i.name]),
  );

  const indices = indexSymbols
    .map((symbol) => {
      const change = quoteChange(quoteList, symbol);
      if (change === null) return null;
      return { symbol, name: indexName[symbol] ?? symbol, changePercent: change };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const canadianNames = CANADIAN_WATCHLIST.map((item) => {
    const change = quoteChange(quoteList, item.symbol);
    if (change === null) return null;
    return { ...item, changePercent: change };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const rawMovers =
    movers.status === "fulfilled"
      ? movers.value
      : { gainers: [] as MarketMover[], losers: [] as MarketMover[] };

  const topMovers = {
    gainers: filterLiquidMovers(rawMovers.gainers, 5),
    losers: filterLiquidMovers(rawMovers.losers, 5),
  };

  const indexSummary =
    indices
      .map((i) => `${i.name}: ${i.changePercent > 0 ? "+" : ""}${i.changePercent.toFixed(2)}%`)
      .join("\n") || "Market data unavailable";

  const recapPrompt = `Write exactly 2 short sentences (max 55 words total) summarizing this week for a Canadian reader.

Index moves:
${indexSummary}

Rules:
- No markdown, headings, bullets, or stock tickers other than the indices above.
- No buy, sell, or hold language. No recommendations.
- Educational context only. No return promises.
- Do not mention individual companies.`;

  let marketRecap: string;
  try {
    marketRecap = sanitizeRecap(
      await claudeChat(
        [{ role: "user", content: recapPrompt }],
        "You write two-sentence market briefs for Mosaic Finance, a Canadian tracking and education app. Education, not advice.",
        { model: "sonnet", maxTokens: 220, temperature: 0.3, cacheSystem: false },
      ),
    );
  } catch {
    marketRecap = `Here is the week of ${weekStart} to ${weekEnd} in one look. ${indexSummary.replace(/\n/g, "; ")}.`;
    marketRecap = sanitizeRecap(marketRecap);
  }

  return {
    marketRecap,
    indices,
    topMovers,
    canadianNames,
    weekStart,
    weekEnd,
  };
}

function buildNewsletterHtml(content: NewsletterContent, email: string): string {
  const recapCard = mosaicCard(
    "This week",
    `<p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(content.marketRecap)}</p>`,
  );

  const indicesCard = content.indices.length
    ? mosaicCard("Markets at a glance", indexTable(content.indices))
    : "";

  const canadianCard = content.canadianNames.length
    ? mosaicCard(
        "Canadian names in view",
        `${indexTable(content.canadianNames)}<p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#9CA3AF;">US-listed tickers shown because the quote feed covers them reliably. Context only — not a list to trade.</p>`,
      )
    : "";

  const gainers = moverTable(content.topMovers.gainers);
  const losers = moverTable(content.topMovers.losers);
  const moversCard =
    gainers || losers
      ? mosaicCard(
          "Notable liquid moves",
          `${gainers ? `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#059669;">Gainers</p>${gainers}` : ""}
           ${losers ? `<p style="margin:16px 0 8px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#DC2626;">Declines</p>${losers}` : ""}
           <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#9CA3AF;">Filtered to names above $5 with a move of 1–40%. Penny names and funds are omitted.</p>`,
        )
      : "";

  return mosaicEmailHtml({
    preheader: content.marketRecap.slice(0, 110),
    kicker: "Weekly market brief",
    title: "Markets this week",
    subtitle: `${content.weekStart} — ${content.weekEnd}`,
    bodyHtml: `${recapCard}${indicesCard}${canadianCard}${moversCard}`,
    email,
    list: "market",
  });
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
        indices: content.indices,
        topMovers: content.topMovers,
        canadianNames: content.canadianNames,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, content };
}

export async function generateAndSendNewsletter(
  recipientEmails?: string[],
): Promise<{ id: string; sent: number; failed: number }> {
  const { id, content } = await generateNewsletter();
  const list =
    recipientEmails && recipientEmails.length > 0
      ? recipientEmails
      : (await collectMarketRecipients()).map((r) => r.email);

  const result =
    list.length === 0
      ? { sent: 0, failed: 0 }
      : await sendMosaicEmailEach(list, (email) => ({
          subject: `Mosaic market brief — ${content.weekStart} to ${content.weekEnd}`,
          html: buildNewsletterHtml(content, email),
          list: "market",
        }));

  const supabase = createServiceClient();
  await supabase
    .from("newsletter_editions")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id);

  return { id, ...result };
}
