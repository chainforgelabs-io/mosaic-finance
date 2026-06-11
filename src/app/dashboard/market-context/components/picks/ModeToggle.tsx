"use client";

import { cn } from "@/lib/utils";
import { MODE_CONFIG } from "@/lib/signals/mode-config";
import { useMarketStore } from "@/stores/market-store";
import type { PicksMode } from "@/types/picks";

export function ModeToggle() {
  const { picksMode, setPicksMode } = useMarketStore();

  async function commitMode(next: PicksMode) {
    const prev = picksMode;
    setPicksMode(next);
    try {
      const res = await fetch("/api/picks/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const body = await res.json();
      const m = body?.settings?.mode as PicksMode | undefined;
      if (m === "light" || m === "heavy") setPicksMode(m);
    } catch {
      setPicksMode(prev);
    }
  }

  const mode: PicksMode = picksMode ?? "light";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-[family-name:var(--font-body)] text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Automation mode
        </span>
        <div className="flex rounded-lg bg-[var(--warm-50)] p-1">
          {(["light", "heavy"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={picksMode === null}
              onClick={() => {
                void commitMode(m);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium transition-colors capitalize",
                mode === m && picksMode !== null
                  ? "bg-white text-[var(--emerald)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                picksMode === null && "cursor-wait opacity-60",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <p className="font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--text-muted)]">
        {MODE_CONFIG[mode].label}. Tracked X: {MODE_CONFIG[mode].trackedAccountsCronCadence}.{" "}
        Firehose: {MODE_CONFIG[mode].firehoseCronCadence}. Aggregation:{" "}
        {MODE_CONFIG[mode].aggregationCronCadence}. Nightly personas (top movers):{" "}
        {MODE_CONFIG[mode].topPersonasNightly}.
      </p>
    </div>
  );
}
