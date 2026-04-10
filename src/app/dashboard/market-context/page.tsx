"use client";

import { cn } from "@/lib/utils";
import { useMarketStore, type MarketTab } from "@/stores/market-store";
import {
  BarChart3,
  Search,
  Newspaper,
  Brain,
} from "lucide-react";
import { MarketOverview } from "./components/MarketOverview";
import { StockLookup } from "./components/StockLookup";
import { NewsHub } from "./components/NewsHub";
import { AICommentary } from "./components/AICommentary";

const tabs: { id: MarketTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "lookup", label: "Lookup", icon: Search },
  { id: "news", label: "News", icon: Newspaper },
  { id: "commentary", label: "AI Commentary", icon: Brain },
];

export default function MarketContextPage() {
  const { activeTab, setActiveTab } = useMarketStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)] sm:text-[28px]">
          Market Context
        </h1>
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-1">
          Real-time market data, news, and AI-powered insights.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="-mx-1 mb-6 overflow-x-auto border-b border-[var(--warm-200)] px-1">
        <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-[var(--emerald)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--emerald)] rounded-t-full" />
            )}
          </button>
        ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <MarketOverview />}
      {activeTab === "lookup" && <StockLookup />}
      {activeTab === "news" && <NewsHub />}
      {activeTab === "commentary" && <AICommentary />}
    </div>
  );
}
