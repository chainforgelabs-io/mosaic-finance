"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useMarketStore } from "@/stores/market-store";
import type { PicksMode, PicksSubTab } from "@/types/picks";
import { Compass, Bookmark, Rss } from "lucide-react";
import { DiscoverView } from "./picks/DiscoverView";
import { MyPicksView } from "./picks/MyPicksView";
import { SourcesView } from "./picks/SourcesView";
import { ModeToggle } from "./picks/ModeToggle";

const SUBTABS: { id: PicksSubTab; label: string; icon: typeof Compass }[] = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "mypicks", label: "My picks", icon: Bookmark },
  { id: "sources", label: "Sources", icon: Rss },
];

export function PicksHub() {
  const { picksSubTab, setPicksSubTab, picksMode, setPicksMode } = useMarketStore();
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      setSettingsError(null);
      try {
        const res = await fetch("/api/picks/settings");
        if (!res.ok) {
          throw new Error(String(res.status));
        }
        const body = await res.json();
        const m = body?.settings?.mode as PicksMode | undefined;
        if (!cancelled) {
          setPicksMode(m === "light" || m === "heavy" ? m : null);
        }
      } catch {
        if (!cancelled) {
          setPicksMode("light");
          setSettingsError("Could not sync picks mode.");
        }
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [setPicksMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <ModeToggle />
        {settingsError && (
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--error)]">
            {settingsError}
          </p>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto border-b border-[var(--warm-200)] px-1">
        <div className="flex min-w-max gap-1">
          {SUBTABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPicksSubTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-medium transition-colors",
                picksSubTab === tab.id
                  ? "text-[var(--emerald)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {picksSubTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[var(--emerald)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {picksMode === null && (
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
          Loading picks configuration…
        </p>
      )}

      {picksSubTab === "discover" && <DiscoverView />}
      {picksSubTab === "mypicks" && <MyPicksView />}
      {picksSubTab === "sources" && <SourcesView />}
    </div>
  );
}
