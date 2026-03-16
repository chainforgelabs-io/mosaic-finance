"use client";

import { useMarketStore } from "@/stores/market-store";
import { useSocialSentiment } from "../hooks/useNews";
import { cn } from "@/lib/utils";
import { MessageCircle, Heart, Repeat2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const SENTIMENT_CONFIG = {
  bullish: { icon: TrendingUp, color: "text-[var(--emerald)]", bg: "bg-emerald-50", label: "Bullish" },
  bearish: { icon: TrendingDown, color: "text-[var(--error)]", bg: "bg-red-50", label: "Bearish" },
  neutral: { icon: Minus, color: "text-[var(--text-muted)]", bg: "bg-gray-50", label: "Neutral" },
};

export function SocialFeed() {
  const { socialSentiment, socialLoading } = useMarketStore();
  useSocialSentiment();

  if (socialLoading) {
    return (
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4 animate-pulse">
        <div className="h-4 w-40 bg-[var(--warm-100)] rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-[var(--warm-50)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!socialSentiment) {
    return (
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6 text-center">
        <MessageCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
          Social sentiment data unavailable
        </p>
      </div>
    );
  }

  const sentimentConfig = SENTIMENT_CONFIG[socialSentiment.overallSentiment];
  const SentimentIcon = sentimentConfig.icon;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[var(--text-secondary)]" />
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
            Social Pulse
          </h3>
          <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
            via X
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            sentimentConfig.bg,
            sentimentConfig.color,
          )}
        >
          <SentimentIcon className="w-3 h-3" />
          {sentimentConfig.label}
        </span>
      </div>

      {socialSentiment.summary && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
          {socialSentiment.summary}
        </p>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {socialSentiment.posts.map((post) => {
          const postSentiment = SENTIMENT_CONFIG[post.sentiment];

          return (
            <div
              key={post.id}
              className="p-3 rounded-lg bg-[var(--warm-50)] border border-[var(--warm-100)]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-primary)]">
                  {post.author}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
                  @{post.authorHandle}
                </span>
                <span
                  className={cn(
                    "ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded",
                    postSentiment.bg,
                    postSentiment.color,
                  )}
                >
                  {postSentiment.label}
                </span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] leading-relaxed">
                {post.text}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="inline-flex items-center gap-1 font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
                  <Heart className="w-2.5 h-2.5" />
                  {post.likes.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
                  <Repeat2 className="w-2.5 h-2.5" />
                  {post.reposts.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
