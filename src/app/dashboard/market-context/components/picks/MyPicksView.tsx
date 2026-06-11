"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMyPicks } from "../../hooks/usePicks";
import { SignalScoreBar, OutlookBadge } from "./SignalScoreBar";
import type { EnrichedPick } from "@/types/picks";
import {
  Bookmark,
  Plus,
  Trash2,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

function PickCard({
  pick,
  onRemove,
  onRefetch,
}: {
  pick: EnrichedPick;
  onRemove: (ticker: string) => void;
  onRefetch: () => void;
}) {
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const signal = pick.signal;
  const changePct = signal?.last_change_pct ?? null;
  const positive = changePct !== null && changePct >= 0;

  async function handleAssess() {
    setAssessing(true);
    setAssessError(null);
    try {
      const res = await fetch("/api/picks/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: pick.ticker }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Assessment failed");
      }
      onRefetch();
    } catch (err) {
      setAssessError(
        err instanceof Error ? err.message : "Assessment failed",
      );
    } finally {
      setAssessing(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[130px]">
          <span className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--text-primary)]">
            {pick.ticker}
          </span>
          <p className="font-[family-name:var(--font-body)] max-w-[200px] truncate text-xs text-[var(--text-muted)]">
            {signal?.name || "No signal data yet"}
            {signal?.sector ? ` · ${signal.sector}` : ""}
          </p>
        </div>

        {signal && (
          <>
            <div className="font-[family-name:var(--font-body)] text-sm">
              <span className="tabular-nums text-[var(--text-primary)]">
                {signal.last_price !== null
                  ? `$${signal.last_price.toFixed(2)}`
                  : "—"}
              </span>{" "}
              {changePct !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 tabular-nums",
                    positive ? "text-[var(--emerald)]" : "text-[var(--error)]",
                  )}
                >
                  {positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {positive ? "+" : ""}
                  {changePct.toFixed(2)}%
                </span>
              )}
            </div>
            <SignalScoreBar score={signal.composite_score} />
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleAssess()}
            disabled={assessing}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-[var(--warm-200)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]",
              assessing && "cursor-wait opacity-60",
            )}
          >
            <Sparkles className={cn("h-3.5 w-3.5", assessing && "animate-pulse")} />
            {assessing ? "Assessing…" : "AI assessment"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(pick.ticker)}
            title="Remove pick"
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {assessError && (
        <p className="font-[family-name:var(--font-body)] mt-2 text-xs text-[var(--error)]">
          {assessError}
        </p>
      )}

      {pick.takes.length > 0 && (
        <div className="mt-3 grid gap-2 border-t border-[var(--warm-100)] pt-3 sm:grid-cols-2">
          {pick.takes.map((take) => (
            <div key={take.id} className="rounded-md bg-[var(--warm-50)] p-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-xs font-semibold capitalize text-[var(--text-primary)]">
                  {take.persona.replace(/_/g, " ")}
                </span>
                <OutlookBadge outlook={take.outlook} />
              </div>
              <p className="font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--text-secondary)]">
                {take.summary}
              </p>
              {take.key_points.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {take.key_points.map((point, idx) => (
                    <li
                      key={idx}
                      className="font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[var(--text-muted)]"
                    >
                      • {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyPicksView() {
  const { picks, loading, error, refetch, addPick, removePick } = useMyPicks();
  const [newTicker, setNewTicker] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    setAdding(true);
    await addPick(ticker);
    setNewTicker("");
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
          placeholder="Add ticker (e.g. NVDA)"
          className="font-[family-name:var(--font-body)] w-48 rounded-lg border border-[var(--warm-200)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={adding || !newTicker.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--emerald)] px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium text-white transition-opacity disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-[var(--warm-50)]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--error)]">
          {error}
        </p>
      )}

      {!loading && !error && picks.length === 0 && (
        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 text-center">
          <Bookmark className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
          <p className="font-[family-name:var(--font-body)] mb-1 text-sm text-[var(--text-secondary)]">
            No picks yet.
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
            Star tickers from the Discover tab or add one above.
          </p>
        </div>
      )}

      {!loading &&
        picks.map((pick) => (
          <PickCard
            key={pick.id}
            pick={pick}
            onRemove={(ticker) => void removePick(ticker)}
            onRefetch={() => void refetch()}
          />
        ))}
    </div>
  );
}
