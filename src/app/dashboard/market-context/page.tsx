"use client";

import { usePlanStore } from "@/stores/plan-store";
import { EmptyState } from "@/components/app/EmptyState";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Landmark,
  Briefcase,
  ShieldAlert,
  Calendar,
} from "lucide-react";

function IndicatorChip({
  label,
  value,
  change,
  direction,
}: {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down";
}) {
  return (
    <div className="flex items-center gap-3 bg-[var(--warm-50)] rounded-lg px-4 py-3">
      <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
        {value}
      </span>
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
          direction === "up" ? "text-[var(--emerald)]" : "text-[var(--error)]"
        }`}
      >
        {direction === "up" ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {change}
      </span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[var(--warm-50)] flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-[var(--text-secondary)]" />
        </div>
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
          {title}
        </h3>
        {badge && (
          <span className="ml-auto text-xs font-medium text-[var(--emerald)] bg-[var(--emerald-soft)] px-2.5 py-0.5 rounded-full font-[family-name:var(--font-body)]">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function MarketContextPage() {
  const { marketContext, isLoading } = usePlanStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-72" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  if (!marketContext) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-[var(--text-primary)]">
            Market Context Report
          </h1>
        </div>
        <EmptyState
          icon={BarChart3}
          title="Market context updates every Monday. Check back soon."
          description="Weekly market commentary providing educational context for your financial plan."
        />
      </div>
    );
  }

  const updatedDate = new Date(marketContext.updatedAt);
  const formattedDate = updatedDate.toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = updatedDate.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-[var(--text-primary)]">
          Market Context Report
        </h1>
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-1">
          Updated weekly. For educational context only.
        </p>
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--emerald)] font-medium mt-1">
          Last updated {formattedDate} at {formattedTime}
        </p>
      </div>

      {/* Persistent disclaimer bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
        <p className="font-[family-name:var(--font-body)] text-[13px] text-amber-800">
          This market commentary is for educational context only. It is not a
          prediction of future performance.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Macro Environment */}
        <SectionCard icon={BarChart3} title="Macro Environment">
          <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] leading-relaxed mb-4">
            {marketContext.macroSummary}
          </p>
          <div className="flex flex-wrap gap-3">
            {marketContext.indicators.map((ind) => (
              <IndicatorChip
                key={ind.label}
                label={ind.label}
                value={ind.value}
                change={ind.change}
                direction={ind.direction}
              />
            ))}
          </div>
        </SectionCard>

        {/* 2. Rate Environment */}
        <SectionCard icon={Landmark} title="Rate Environment">
          <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] leading-relaxed">
            {marketContext.rateSummary}
          </p>
          <div className="mt-4 bg-[var(--warm-50)] rounded-lg p-4">
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                Impact on portfolios:
              </span>{" "}
              Stable rates support bond valuations and reduce refinancing risk
              for variable-rate debt holders. Fixed income allocations should
              maintain current positioning.
            </p>
          </div>
        </SectionCard>

        {/* 3. Relevant to Your Portfolio */}
        <SectionCard
          icon={Briefcase}
          title="Relevant to Your Portfolio"
          badge="Based on your portfolio"
        >
          <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] leading-relaxed">
            {marketContext.portfolioRelevance}
          </p>
        </SectionCard>

        {/* 4. Risk Factors to Watch */}
        <SectionCard icon={ShieldAlert} title="Risk Factors to Watch">
          <ul className="space-y-3">
            {marketContext.riskFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 w-2 h-2 rounded-full bg-[var(--warning)] shrink-0" />
                <span className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)]">
                  {factor}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-[var(--text-muted)]">
        <Calendar className="w-4 h-4" />
        <p className="font-[family-name:var(--font-body)] text-xs">
          Next update: Monday
        </p>
      </div>
    </div>
  );
}
