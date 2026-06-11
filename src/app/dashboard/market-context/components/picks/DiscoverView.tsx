"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMarketStore } from "@/stores/market-store";
import {
  usePicksSignals,
  useMyPicks,
  useScan,
  useTickerDetail,
} from "../../hooks/usePicks";
import { SignalScoreBar, OutlookBadge } from "./SignalScoreBar";
import type { DiscoverFilter, TickerSignal } from "@/types/picks";
import {
  RefreshCw,
  Star,
  TrendingUp,
  TrendingDown,
  Radar,
  Flame,
  ChevronDown,
  ChevronUp,
  Telescope,
} from "lucide-react";

const FILTERS: { id: DiscoverFilter; label: string; icon: typeof Flame }[] = [
  { id: "top", label: "Top signals", icon: Flame },
  { id: "movers", label: "Big movers", icon: TrendingUp },
  { id: "radar", label: "Under the radar", icon: Radar },
];

const SOURCE_LABELS: Record<string, string> = {
  x_tracked: "Tracked X",
  x_firehose: "X trend",
  congress: "Congress",
  news: "News",
  price_action: "Price",
};

function ChangeText({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-[var(--text-muted)]">—</span>;
  }
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        positive ? "text-[var(--emerald)]" : "text-[var(--error)]",
      )}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

function SignalRow({
  signal,
  picked,
  onTogglePick,
}: {
  signal: TickerSignal;
  picked: boolean;
  onTogglePick: (ticker: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { detail, loading } = useTickerDetail(expanded ? signal.ticker : null);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <button
          type="button"
          onClick={() => onTogglePick(signal.ticker)}
          title={picked ? "Remove from my picks" : "Add to my picks"}
          className="shrink-0"
        >
          <Star
            className={cn(
              "h-4 w-4 transition-colors",
              picked
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--warm-200)] hover:text-amber-400",
            )}
          />
        </button>

        <div className="min-w-[120px]">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--text-primary)]">
              {signal.ticker}
            </span>
            {signal.big_mover && (
              <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
                Mover
              </span>
            )}
            {signal.under_the_radar && (
              <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                Radar
              </span>
            )}
          </div>
          <p className="font-[family-name:var(--font-body)] max-w-[200px] truncate text-xs text-[var(--text-muted)]">
            {signal.name || "—"}
            {signal.sector ? ` · ${signal.sector}` : ""}
          </p>
        </div>

        <div className="min-w-[110px] font-[family-name:var(--font-body)] text-sm">
          <span className="tabular-nums text-[var(--text-primary)]">
            {signal.last_price !== null ? `$${signal.last_price.toFixed(2)}` : "—"}
          </span>{" "}
          <ChangeText pct={signal.last_change_pct} />
        </div>

        <div className="min-w-[120px]">
          <SignalScoreBar score={signal.composite_score} />
        </div>

        <div className="font-[family-name:var(--font-body)] flex flex-wrap gap-x-3 text-[11px] text-[var(--text-muted)]">
          <span>{signal.mention_count_24h ?? 0} mentions 24h</span>
          <span>{signal.tracked_account_mentions_24h ?? 0} alpha</span>
          {(signal.congress_buys_30d ?? 0) + (signal.congress_sells_30d ?? 0) >
            0 && (
            <span>
              congress {signal.congress_buys_30d ?? 0}B/
              {signal.congress_sells_30d ?? 0}S
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--warm-100)] p-4">
          {loading && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
              Loading signal detail…
            </p>
          )}
          {!loading && detail && (
            <div className="space-y-3">
              {detail.takes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-secondary)]">
                    AI investor takes
                  </h4>
                  {detail.takes.map((take) => (
                    <div
                      key={take.id}
                      className="rounded-md bg-[var(--warm-50)] p-2.5"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-[family-name:var(--font-display)] text-xs font-semibold capitalize text-[var(--text-primary)]">
                          {take.persona.replace(/_/g, " ")}
                        </span>
                        <OutlookBadge outlook={take.outlook} />
                      </div>
                      <p className="font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--text-secondary)]">
                        {take.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-secondary)]">
                  Recent signals
                </h4>
                {detail.recentSignals.length === 0 && (
                  <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
                    No raw signals stored yet.
                  </p>
                )}
                {detail.recentSignals.slice(0, 8).map((raw) => (
                  <div
                    key={raw.id}
                    className="rounded-md border border-[var(--warm-100)] p-2.5"
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="rounded bg-[var(--warm-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                        {SOURCE_LABELS[raw.source] || raw.source}
                      </span>
                      {raw.author_handle && (
                        <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
                          {raw.source === "congress"
                            ? raw.author_handle
                            : `@${raw.author_handle}`}
                        </span>
                      )}
                      <span className="font-[family-name:var(--font-body)] ml-auto text-[10px] text-[var(--text-muted)]">
                        {new Date(raw.occurred_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--text-secondary)]">
                      {(raw.content || "").slice(0, 240)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DiscoverView() {
  const { picksMode } = useMarketStore();
  const [filter, setFilter] = useState<DiscoverFilter>("top");
  const { signals, loading, error, refetch } = usePicksSignals(filter);
  const { picks, addPick, removePick } = useMyPicks();
  const { scanning, lastSummary, scanError, runScan } = useScan();

  const pickedTickers = new Set(picks.map((p) => p.ticker));

  async function handleScan() {
    const ok = await runScan(picksMode === "heavy" ? true : undefined);
    if (ok) await refetch();
  }

  function handleTogglePick(ticker: string) {
    if (pickedTickers.has(ticker)) {
      void removePick(ticker);
    } else {
      void addPick(ticker);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[var(--warm-50)] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-white text-[var(--emerald)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleScan()}
          disabled={scanning}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-[var(--warm-200)] bg-white px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]",
            scanning && "cursor-wait opacity-60",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin")} />
          {scanning ? "Scanning…" : "Run scan"}
        </button>
      </div>

      {scanError && (
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--error)]">
          {scanError}
        </p>
      )}
      {lastSummary && !scanning && (
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
          Scan complete: {lastSummary.trackedPostsIngested} tracked posts,{" "}
          {lastSummary.firehosePostsIngested} trend signals,{" "}
          {lastSummary.newsSignalsIngested} news signals →{" "}
          {lastSummary.tickersAggregated} tickers scored.
          {lastSummary.errors.length > 0 &&
            ` (${lastSummary.errors.length} source errors)`}
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-[var(--warm-50)]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--error)]">
          {error}
        </p>
      )}

      {!loading && !error && signals.length === 0 && (
        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 text-center">
          <Telescope className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
          <p className="font-[family-name:var(--font-body)] mb-1 text-sm text-[var(--text-secondary)]">
            No signals yet.
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
            Run a scan to ingest tracked X accounts, news, and trends.
          </p>
        </div>
      )}

      {!loading &&
        signals.map((signal) => (
          <SignalRow
            key={signal.ticker}
            signal={signal}
            picked={pickedTickers.has(signal.ticker)}
            onTogglePick={handleTogglePick}
          />
        ))}
    </div>
  );
}
