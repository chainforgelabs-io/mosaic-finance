"use client";

import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Tag,
} from "lucide-react";
import type { InvestorCommentary } from "@/lib/market-data/types";
import type { Persona } from "@/lib/ai-commentary/personas";

interface CommentaryDetailProps {
  persona: Persona;
  commentary: InvestorCommentary;
  onBack: () => void;
}

const OUTLOOK_CONFIG = {
  very_bullish: { label: "Very Bullish", icon: TrendingUp, color: "text-[var(--emerald)]", bg: "bg-emerald-50", border: "border-emerald-200" },
  bullish: { label: "Bullish", icon: TrendingUp, color: "text-[var(--emerald)]", bg: "bg-emerald-50", border: "border-emerald-200" },
  neutral: { label: "Neutral", icon: Minus, color: "text-[var(--text-muted)]", bg: "bg-gray-50", border: "border-gray-200" },
  bearish: { label: "Bearish", icon: TrendingDown, color: "text-[var(--error)]", bg: "bg-red-50", border: "border-red-200" },
  very_bearish: { label: "Very Bearish", icon: TrendingDown, color: "text-[var(--error)]", bg: "bg-red-50", border: "border-red-200" },
};

export function CommentaryDetail({
  persona,
  commentary,
  onBack,
}: CommentaryDetailProps) {
  const outlook = OUTLOOK_CONFIG[commentary.outlook] || OUTLOOK_CONFIG.neutral;
  const OutlookIcon = outlook.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg border border-[var(--warm-200)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--warm-50)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: persona.accentColor }}
        >
          {persona.avatarInitials}
        </div>
        <div className="flex-1">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-[var(--text-primary)]">
            {persona.name}&apos;s Market View
          </h2>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
            {persona.title}
            {persona.fundOrCompany ? ` · ${persona.fundOrCompany}` : ""} ·{" "}
            {new Date(commentary.generatedAt).toLocaleDateString("en-CA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Outlook badge */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-5 py-3 border",
          outlook.bg,
          outlook.border,
        )}
      >
        <OutlookIcon className={cn("w-5 h-5", outlook.color)} />
        <div>
          <p className={cn("font-[family-name:var(--font-display)] text-sm font-semibold", outlook.color)}>
            Overall Outlook: {outlook.label}
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mt-0.5">
            Analysis via {commentary.modelUsed === "opus" ? "Claude Opus" : "Claude Sonnet"}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-3">
          Market Assessment
        </h3>
        <div className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
          {commentary.summary}
        </div>
      </div>

      {/* Key Themes */}
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-[var(--text-secondary)]" />
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
            Key Themes
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {commentary.keyThemes.map((theme, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full border border-[var(--warm-200)] bg-[var(--warm-50)] font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
            Risk Assessment
          </h3>
        </div>
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
          {commentary.riskAssessment}
        </p>
      </div>

      {/* Actionable Insights */}
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-[var(--emerald)]" />
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
            Actionable Insights
          </h3>
        </div>
        <ul className="space-y-2.5">
          {commentary.actionableInsights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
              <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                {insight}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
        <p className="font-[family-name:var(--font-body)] text-[11px] text-amber-800">
          This AI-generated commentary simulates an investment philosophy for educational purposes only.
          It does not represent the actual views of {persona.name}. This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.
        </p>
      </div>
    </div>
  );
}
