"use client";

import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { InvestorCommentary } from "@/lib/market-data/types";
import type { Persona } from "@/lib/ai-commentary/personas";

interface InvestorCardProps {
  persona: Persona;
  commentary: InvestorCommentary | null;
  onExpand: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const OUTLOOK_CONFIG = {
  very_bullish: { label: "Very Bullish", icon: TrendingUp, color: "text-[var(--emerald)]", bg: "bg-emerald-50" },
  bullish: { label: "Bullish", icon: TrendingUp, color: "text-[var(--emerald)]", bg: "bg-emerald-50" },
  neutral: { label: "Neutral", icon: Minus, color: "text-[var(--text-muted)]", bg: "bg-gray-50" },
  bearish: { label: "Bearish", icon: TrendingDown, color: "text-[var(--error)]", bg: "bg-red-50" },
  very_bearish: { label: "Very Bearish", icon: TrendingDown, color: "text-[var(--error)]", bg: "bg-red-50" },
};

export function InvestorCard({
  persona,
  commentary,
  onExpand,
  onGenerate,
  isGenerating,
}: InvestorCardProps) {
  const outlook = commentary
    ? OUTLOOK_CONFIG[commentary.outlook] || OUTLOOK_CONFIG.neutral
    : null;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5 hover:border-[var(--emerald)]/30 transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: persona.accentColor }}
        >
          {persona.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">
            {persona.name}
          </h3>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
            {persona.title}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
            {persona.philosophySummary}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)] mt-1 opacity-90">
            {persona.fundOrCompany}
          </p>
        </div>
        {outlook && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
              outlook.bg,
              outlook.color,
            )}
          >
            <outlook.icon className="w-3 h-3" />
            {outlook.label}
          </span>
        )}
      </div>

      {commentary ? (
        <>
          {/* Summary preview */}
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-3">
            {commentary.summary}
          </p>

          {/* Key themes */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {commentary.keyThemes.slice(0, 3).map((theme, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-[var(--warm-50)] font-[family-name:var(--font-body)] text-[10px] text-[var(--text-secondary)]"
              >
                {theme}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
              {new Date(commentary.generatedAt).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" · "}
              {commentary.modelUsed === "opus" ? "Claude Opus" : "Claude Sonnet"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--emerald)] transition-colors disabled:opacity-50"
                title="Regenerate"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={onExpand}
                className="flex items-center gap-1 font-[family-name:var(--font-body)] text-xs font-medium text-[var(--emerald)] hover:text-[var(--emerald-dark)] transition-colors"
              >
                Read more
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            {persona.strategySummary}
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-medium hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Analysis"
            )}
          </button>
        </>
      )}
    </div>
  );
}
