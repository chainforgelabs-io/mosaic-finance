"use client";

import { ExternalLink, Clock } from "lucide-react";
import type { NewsArticle } from "@/lib/market-data/types";

interface NewsCardProps {
  article: NewsArticle;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  macro: "bg-blue-50 text-blue-700",
  equities: "bg-emerald-50 text-emerald-700",
  crypto: "bg-purple-50 text-purple-700",
  commodities: "bg-amber-50 text-amber-700",
  canadian: "bg-red-50 text-red-700",
  general: "bg-gray-50 text-gray-700",
};

export function NewsCard({ article }: NewsCardProps) {
  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-[var(--warm-200)] rounded-lg p-4 hover:border-[var(--emerald)]/30 hover:shadow-sm transition-all group"
    >
      <div className="flex gap-4">
        {article.imageUrl && (
          <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[var(--warm-50)]">
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}`}
            >
              {article.category}
            </span>
            <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
              {article.source}
            </span>
          </div>

          <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--emerald)] transition-colors">
            {article.title}
          </h4>

          {article.summary && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              {article.summary}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(article.publishedAt)}
            </span>
            {article.relatedTickers.length > 0 && (
              <div className="flex gap-1">
                {article.relatedTickers.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded bg-[var(--warm-50)] font-[family-name:var(--font-body)] text-[10px] font-medium text-[var(--text-secondary)]"
                  >
                    ${t}
                  </span>
                ))}
              </div>
            )}
            <ExternalLink className="w-3 h-3 text-[var(--text-muted)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </a>
  );
}
