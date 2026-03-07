"use client";

import { usePlanStore } from "@/stores/plan-store";
import { HealthScore } from "@/components/app/HealthScore";
import { FinancialCard } from "@/components/app/FinancialCard";
import { EmptyState } from "@/components/app/EmptyState";
import { ApprovalStatusBanner } from "@/components/app/ApprovalStatusBanner";
import { HouseholdCard } from "@/components/app/HouseholdCard";
import { MeetingHistory } from "@/components/app/MeetingHistory";
import { ReviewReminder } from "@/components/app/ReviewReminder";
import { FileText, ArrowRight, Lock, TrendingUp } from "lucide-react";
import Link from "next/link";

function DashboardNoPlan() {
  return (
    <EmptyState
      icon={FileText}
      title="Your financial plan will appear here once you complete setup."
      description="Complete the onboarding process to generate your personalized financial plan, reviewed by a CIM professional."
      ctaLabel="Complete Setup"
      ctaHref="/onboarding"
    />
  );
}

function DashboardPending() {
  const { plan } = usePlanStore();

  const placeholderSections = [
    "Executive Summary",
    "Cash Flow Analysis",
    "Debt Management",
    "Retirement Projections",
    "Investment Strategy",
    "Tax Optimization",
    "Insurance & Estate",
    "Next Steps",
  ];

  return (
    <div className="space-y-6">
      <ApprovalStatusBanner
        status="pending_review"
        estimatedDelivery={plan?.estimatedDelivery ?? "Within 24 hours"}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {placeholderSections.map((title) => (
          <div
            key={title}
            className="relative bg-white border border-[var(--warm-200)] rounded-lg p-6 overflow-hidden"
          >
            <div className="blur-sm select-none pointer-events-none">
              <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {title}
              </p>
              <div className="skeleton h-8 w-24 mb-2" />
              <div className="skeleton h-3 w-full mb-1" />
              <div className="skeleton h-3 w-3/4" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Lock className="w-6 h-6 text-[var(--emerald)]" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)] mb-4">
          While you wait
        </h3>
        <div className="space-y-3">
          {[
            {
              title: "RRSP vs. TFSA: Which should you prioritize?",
              desc: "Understanding the tax implications of each registered account can significantly impact your long-term wealth.",
            },
            {
              title: "The power of low-MER ETFs",
              desc: "A 1% difference in fees can cost over $100,000 over a 30-year investment horizon. Learn why MER matters.",
            },
            {
              title: "Emergency fund best practices",
              desc: "How much is enough? Most Canadians are under-prepared for unexpected expenses.",
            },
          ].map((tip) => (
            <div key={tip.title} className="p-4 bg-[var(--warm-50)] rounded-lg">
              <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-1">
                {tip.title}
              </p>
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                {tip.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardDelivered() {
  const { plan, marketContext } = usePlanStore();

  if (!plan) return null;

  const daysSinceDelivery = plan.deliveredAt
    ? Math.floor((Date.now() - new Date(plan.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const keyInsights = [
    {
      text: "Maximize RRSP contribution room ($18,200 available)",
      detail: "Estimated $5,460 tax refund at your marginal rate",
    },
    {
      text: "Consolidate to low-MER ETF portfolio (target 0.18% weighted MER)",
      detail: "Reduces fee drag by ~$2,400/year on current portfolio",
    },
    {
      text: "Accelerate line of credit repayment to $600/mo",
      detail: "Eliminates $14,400 balance in 28 months, saves $1,840 in interest",
    },
  ];

  return (
    <div className="space-y-8">
      {daysSinceDelivery <= 7 && (
        <ApprovalStatusBanner status="delivered" planId={plan.id} />
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
        <div className="flex flex-col items-center">
          <HealthScore score={plan.healthScore} size="lg" />
          <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-secondary)] mt-3">
            Health Score
          </p>
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <FinancialCard label="NET WORTH" value={plan.netWorth} trend="+12.4%" trendDirection="up" />
          <FinancialCard label="MONTHLY CASH FLOW" value={plan.monthlyCashFlow} trend="+$320" trendDirection="up" />
          <FinancialCard label="SAVINGS RATE" value={plan.savingsRate} trend="+3.2%" trendDirection="up" />
          <FinancialCard label="RETIREMENT GAP" value={plan.retirementGap} trend="-$4,200" trendDirection="down" />
        </div>
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
          Key Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {keyInsights.map((insight) => (
            <Link
              key={insight.text}
              href={`/dashboard/plan/${plan.id}`}
              className="group bg-white border border-[var(--warm-200)] rounded-lg p-5 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-[var(--emerald)] mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <div>
                  <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] mb-1">
                    {insight.text}
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]">
                    {insight.detail}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <ReviewReminder />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <HouseholdCard />
        <MeetingHistory />
      </div>

      {marketContext && (
        <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--emerald)]" />
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">
                Market Context
              </h3>
            </div>
            <Link
              href="/dashboard/market-context"
              className="font-[family-name:var(--font-display)] text-sm text-[var(--emerald)] font-medium hover:underline"
            >
              View Full Report
            </Link>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mb-3">
            {marketContext.headline}
          </p>
          <div className="flex gap-4">
            {marketContext.indicators.map((ind) => (
              <div key={ind.label} className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
                  {ind.label}
                </span>
                <span className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums">
                  {ind.value}
                </span>
                <span
                  className={`text-xs font-medium tabular-nums ${
                    ind.direction === "up" ? "text-[var(--emerald)]" : "text-[var(--error)]"
                  }`}
                >
                  {ind.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { planStatus, isLoading } = usePlanStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-44 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          Dashboard
        </h1>
      </div>

      {planStatus === "none" && <DashboardNoPlan />}
      {planStatus === "pending_review" && <DashboardPending />}
      {(planStatus === "delivered" || planStatus === "generating") && <DashboardDelivered />}
    </div>
  );
}
