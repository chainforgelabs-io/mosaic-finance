"use client";

import { useState, useMemo } from "react";
import { useMarketStore } from "@/stores/market-store";
import { useNews } from "../hooks/useNews";
import { NewsCard } from "./NewsCard";
import { SocialFeed } from "./SocialFeed";
import { cn } from "@/lib/utils";
import { RefreshCw, Filter } from "lucide-react";
import type { NewsCategory, NewsPeriod } from "@/lib/market-data/types";

const PERIOD_TABS: { id: NewsPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

const CATEGORIES: { id: NewsCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "macro", label: "Macro" },
  { id: "equities", label: "Equities" },
  { id: "crypto", label: "Crypto" },
  { id: "commodities", label: "Commodities" },
  { id: "canadian", label: "Canadian" },
];

function isWithinPeriod(dateStr: string, period: NewsPeriod): boolean {
  const date = new Date(dateStr);
  const now = new Date();

  switch (period) {
    case "today": {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return date >= startOfDay;
    }
    case "week": {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return date >= weekAgo;
    }
    case "month": {
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      return date >= monthAgo;
    }
  }
}

export function NewsHub() {
  const { newsArticles, newsLoading, newsError } = useMarketStore();
  const { refetch } = useNews();

  const [period, setPeriod] = useState<NewsPeriod>("today");
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return newsArticles.filter((a) => {
      if (!isWithinPeriod(a.publishedAt, period)) return false;
      if (category !== "all" && a.category !== category) return false;
      return true;
    });
  }, [newsArticles, period, category]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  }

  return (
    <div className="space-y-6">
      {/* Period tabs + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[var(--warm-50)] rounded-lg p-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md font-[family-name:var(--font-display)] text-xs font-medium transition-colors",
                period === tab.id
                  ? "bg-white text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={newsLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--warm-200)] text-[var(--text-secondary)] hover:bg-[var(--warm-50)] transition-colors font-[family-name:var(--font-body)] text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-2.5 py-1 rounded-full font-[family-name:var(--font-body)] text-xs font-medium transition-colors",
                category === cat.id
                  ? "bg-[var(--emerald)] text-white"
                  : "bg-[var(--warm-50)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {newsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="font-[family-name:var(--font-body)] text-sm text-red-700">
            {newsError}
          </p>
        </div>
      )}

      {/* Two-column layout: news + social feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {newsLoading && filtered.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[var(--warm-200)] rounded-lg p-4 animate-pulse"
              >
                <div className="h-3 w-16 bg-[var(--warm-100)] rounded mb-2" />
                <div className="h-4 w-3/4 bg-[var(--warm-100)] rounded mb-1" />
                <div className="h-3 w-1/2 bg-[var(--warm-100)] rounded" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
                No news articles found for this period and category.
              </p>
            </div>
          ) : (
            filtered.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))
          )}
        </div>

        <div>
          <SocialFeed />
        </div>
      </div>
    </div>
  );
}
