"use client";

import { useEffect, useState } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { HealthScore } from "@/components/app/HealthScore";
import { FinancialCard } from "@/components/app/FinancialCard";
import { EmptyState } from "@/components/app/EmptyState";
import { ApprovalStatusBanner } from "@/components/app/ApprovalStatusBanner";
import { HouseholdCard } from "@/components/app/HouseholdCard";
import { MeetingHistory } from "@/components/app/MeetingHistory";
import { ReviewReminder } from "@/components/app/ReviewReminder";
import { RetirementIncomeChart } from "@/components/charts/RetirementIncomeChart";
import { RetirementProgressBar } from "@/components/charts/RetirementProgressBar";
import { DebtBreakdownChart } from "@/components/charts/DebtBreakdownChart";
import { ScoreBreakdownChart } from "@/components/charts/ScoreBreakdownChart";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { NetWorthTimeline } from "@/components/charts/NetWorthTimeline";
import {
  FileText,
  ArrowRight,
  TrendingUp,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const GENERATION_STEPS = [
  "Analyzing your financial profile",
  "Building retirement projections",
  "Analyzing investment considerations",
  "Running tax efficiency analysis",
  "Finalizing plan...",
] as const;

const STEP_INTERVAL_MS = 1500;

function DashboardGenerating() {
  const [visibleSteps, setVisibleSteps] = useState(1);

  useEffect(() => {
    if (visibleSteps >= GENERATION_STEPS.length) return;
    const timer = setTimeout(() => {
      setVisibleSteps((prev) => Math.min(prev + 1, GENERATION_STEPS.length));
    }, STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [visibleSteps]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-8">
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)] mb-6">
          Building your financial plan
        </h2>
        <div className="mb-6 space-y-3">
          {GENERATION_STEPS.map((step, index) => {
            const isVisible = index < visibleSteps;
            const isComplete = index < visibleSteps - 1;
            const isCurrent = index === visibleSteps - 1;
            const isLast = index === GENERATION_STEPS.length - 1;

            return (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-3 transition-all",
                  isVisible
                    ? "opacity-100"
                    : "pointer-events-none h-0 overflow-hidden opacity-0",
                )}
                style={
                  isVisible
                    ? { animation: "checklist-enter 400ms ease-out both" }
                    : undefined
                }
              >
                {isComplete ? (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)]">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                ) : isCurrent && isLast ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-[var(--emerald)]" />
                ) : isCurrent ? (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)]">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="size-5 shrink-0 rounded-full border-2 border-[var(--warm-200)]" />
                )}
                <span
                  className={cn(
                    "font-body text-[15px]",
                    isComplete || (isCurrent && !isLast)
                      ? "text-[var(--text-primary)]"
                      : isCurrent && isLast
                        ? "text-[var(--text-secondary)]"
                        : "text-[var(--text-muted)]",
                  )}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
        <p className="font-body text-[14px] text-[var(--text-muted)] mb-4">
          This usually takes a few minutes
        </p>
        <p className="font-body text-[14px] text-[var(--text-secondary)]">
          Once generated, a CIM-designated professional will review your plan before delivery.
        </p>
      </div>
    </div>
  );
}

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

function ExpandablePlanSection({
  section,
}: {
  section: { id: string; title: string; summary: string; actionItems: { id: string; text: string; priority: string }[] };
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? section.actionItems : section.actionItems.slice(0, 2);
  const hasMore = section.actionItems.length > 2;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-[var(--emerald)] shrink-0" />
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
          {section.title}
        </h3>
      </div>
      {section.summary && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mb-3 line-clamp-3">
          {section.summary}
        </p>
      )}
      {section.actionItems.length > 0 && (
        <div className="space-y-1.5">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 text-[var(--emerald)] mt-1 shrink-0" />
              <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] line-clamp-2">
                {item.text}
              </p>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 font-[family-name:var(--font-body)] text-xs font-medium text-[var(--emerald)] hover:text-[#059669] pl-5 mt-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  +{section.actionItems.length - 2} more action items
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function fmtKpi(n: number | null | undefined): string {
  if (n == null) return "--";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function KPIStrip({ plan }: { plan: NonNullable<ReturnType<typeof usePlanStore.getState>["plan"]> }) {
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const diag = rawPlanData?.financial_health_diagnostic as Record<string, unknown> | undefined;
  const debtPlan = rawPlanData?.debt_elimination_plan as Record<string, unknown> | undefined;

  const totalDebt = (debtPlan?.total_debt as number) ?? 0;
  const netWorthNum = (diag?.net_worth as number) ?? null;
  const totalAssets = netWorthNum != null ? netWorthNum + totalDebt : null;
  const emergencyMonths = (diag?.emergency_fund_months as number) ?? null;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
      {plan.healthScore > 0 && (
        <div className="flex flex-col items-center shrink-0">
          <HealthScore score={plan.healthScore} size="lg" />
          <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-secondary)] mt-3">
            Health Score
          </p>
        </div>
      )}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
        <FinancialCard
          label="NET WORTH"
          value={plan.netWorth ?? "--"}
          className="bg-gradient-to-br from-white to-emerald-50/40"
        />
        <FinancialCard
          label="MONTHLY CASH FLOW"
          value={plan.monthlyCashFlow ?? "--"}
          className="bg-gradient-to-br from-white to-blue-50/40"
        />
        <FinancialCard
          label="TOTAL ASSETS"
          value={fmtKpi(totalAssets)}
          className="bg-gradient-to-br from-white to-indigo-50/40"
        />
        <FinancialCard
          label="TOTAL DEBT"
          value={totalDebt ? fmtKpi(totalDebt) : "--"}
          className="bg-gradient-to-br from-white to-red-50/30"
        />
        <div className="rounded-lg border border-[var(--warm-200)] p-6 bg-gradient-to-br from-white to-amber-50/40 transition-shadow hover:shadow-sm">
          <p className="font-body text-[13px] font-normal uppercase tracking-wider text-[var(--text-muted)]">
            EMERGENCY FUND
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-body text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
              {emergencyMonths != null ? emergencyMonths.toFixed(1) : "--"}
            </span>
            {emergencyMonths != null && (
              <span className="font-body text-sm text-[var(--text-muted)]">mo</span>
            )}
          </div>
          {emergencyMonths != null && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((emergencyMonths / 6) * 100, 100)}%`,
                    background: emergencyMonths >= 6 ? "var(--emerald)" : emergencyMonths >= 3 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartGrid() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RetirementIncomeChart />
        <RetirementProgressBar />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DebtBreakdownChart />
        <AssetAllocationChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetWorthTimeline />
        <ScoreBreakdownChart />
      </div>
    </>
  );
}

function DashboardPending() {
  const { plan } = usePlanStore();

  if (!plan) {
    return (
      <div className="space-y-6">
        <ApprovalStatusBanner status="pending_review" estimatedDelivery="Within 24 hours" />
        <div className="skeleton h-44 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ApprovalStatusBanner
        status="pending_review"
        estimatedDelivery={plan.estimatedDelivery ?? "Within 24 hours"}
      />

      <Link
        href="/dashboard/plan"
        className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 hover:bg-emerald-100 transition-colors group"
      >
        <FileText className="w-5 h-5 text-[var(--emerald)] shrink-0" />
        <div className="flex-1">
          <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--emerald-dark)]">
            Your draft plan is ready to view
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mt-0.5">
            Download a watermarked draft while it&apos;s under CIM review
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--emerald)] group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <KPIStrip plan={plan} />
      <ChartGrid />

      {plan.sections.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
            Plan Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.sections.map((section) => (
              <ExpandablePlanSection key={section.id} section={section} />
            ))}
          </div>
        </div>
      )}

      <HouseholdCard />
    </div>
  );
}

function DashboardDelivered() {
  const { plan, marketContext } = usePlanStore();

  if (!plan) return null;

  const daysSinceDelivery = plan.deliveredAt
    ? Math.floor((Date.now() - new Date(plan.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return (
    <div className="space-y-8">
      {daysSinceDelivery <= 7 && (
        <ApprovalStatusBanner status="delivered" planId={plan.id} />
      )}

      <KPIStrip plan={plan} />
      <ChartGrid />

      {plan.sections.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
            Plan Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.sections.map((section) => (
              <ExpandablePlanSection key={section.id} section={section} />
            ))}
          </div>
        </div>
      )}

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
      {planStatus === "generating" && <DashboardGenerating />}
      {planStatus === "pending_review" && <DashboardPending />}
      {planStatus === "delivered" && <DashboardDelivered />}
    </div>
  );
}
