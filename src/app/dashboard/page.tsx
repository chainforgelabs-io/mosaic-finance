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

function fmtSnapshotValue(n: number | null, prefix = "$"): string {
  if (n == null) return "--";
  if (prefix === "$") {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n).toLocaleString()}`;
    return `$${n.toLocaleString()}`;
  }
  return String(n);
}

function DashboardGenerating() {
  const [visibleSteps, setVisibleSteps] = useState(1);
  const prePlanData = usePlanStore((s) => s.prePlanData);

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

      {prePlanData && (
        <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-4">
            Your Financial Snapshot
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">Annual Income</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums">{fmtSnapshotValue(prePlanData.annualIncome)}</p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">Monthly Expenses</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums">{fmtSnapshotValue(prePlanData.monthlyExpenses)}</p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">Investments</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--emerald)] tabular-nums">{fmtSnapshotValue(prePlanData.totalInvestments)}</p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">Total Debt</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums" style={{ color: prePlanData.totalDebt && prePlanData.totalDebt > 0 ? "var(--error)" : "var(--text-primary)" }}>{fmtSnapshotValue(prePlanData.totalDebt)}</p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">Emergency Fund</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums" style={{ color: prePlanData.emergencyFundMonths != null && prePlanData.emergencyFundMonths >= 3 ? "var(--emerald)" : "var(--error)" }}>
                {prePlanData.emergencyFundMonths != null ? `${prePlanData.emergencyFundMonths.toFixed(1)} mo` : "--"}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">Target Retirement</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {prePlanData.retirementAge != null ? `Age ${prePlanData.retirementAge}` : "--"}
              </p>
            </div>
          </div>
        </div>
      )}
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

function DashboardFailed() {
  const [retrying, setRetrying] = useState(false);
  const { setPlanStatus } = usePlanStore();

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/plan/generate", { method: "POST", credentials: "include" });
      if (res.ok) {
        setPlanStatus("generating");
      }
    } catch {
      // stay on failed
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50">
          <FileText className="size-6 text-[var(--error)]" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)] mb-2">
          Plan generation failed
        </h2>
        <p className="font-[family-name:var(--font-body)] text-[14px] text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Something went wrong while generating your financial plan. This is usually temporary — please try again.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-[family-name:var(--font-display)] text-[14px] font-semibold text-white transition-colors hover:bg-[#059669] disabled:opacity-60"
        >
          {retrying ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {retrying ? "Retrying..." : "Retry Plan Generation"}
        </button>
      </div>
    </div>
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

function DashGlassCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-5 hover:bg-white/[0.09] transition-colors">
      <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/40 mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-[26px] font-bold tabular-nums" style={{ color: accent ?? "#c9aa71" }}>
          {value}
        </span>
        {unit && <span className="font-[family-name:var(--font-body)] text-xs text-white/35">{unit}</span>}
      </div>
    </div>
  );
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
    <div className="rounded-xl bg-[#0f1923] p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {plan.healthScore > 0 && (
          <div className="flex flex-col items-center shrink-0">
            <HealthScore score={plan.healthScore} size="lg" />
            <p className="font-[family-name:var(--font-display)] font-semibold text-[11px] uppercase tracking-wider text-white/50 mt-2">
              Health Score
            </p>
          </div>
        )}

        <div className="hidden md:block w-px h-20 bg-white/10" />

        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
          <DashGlassCard label="Net Worth" value={plan.netWorth ?? "--"} accent="#10b981" />
          <DashGlassCard label="Cash Flow" value={plan.monthlyCashFlow ?? "--"} unit="/mo" accent="#818cf8" />
          <DashGlassCard label="Total Assets" value={fmtKpi(totalAssets)} />
          <DashGlassCard label="Total Debt" value={totalDebt ? fmtKpi(totalDebt) : "--"} accent={totalDebt > 0 ? "#ef4444" : "#c9aa71"} />
          <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-5">
            <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/40 mb-2">
              Emergency Fund
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-[family-name:var(--font-display)] text-[26px] font-bold tabular-nums" style={{ color: emergencyMonths != null && emergencyMonths >= 6 ? "#10b981" : emergencyMonths != null && emergencyMonths >= 3 ? "#f59e0b" : "#c9aa71" }}>
                {emergencyMonths != null ? emergencyMonths.toFixed(1) : "--"}
              </span>
              {emergencyMonths != null && <span className="font-[family-name:var(--font-body)] text-xs text-white/35">mo</span>}
            </div>
            {emergencyMonths != null && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((emergencyMonths / 6) * 100, 100)}%`,
                      background: emergencyMonths >= 6 ? "#10b981" : emergencyMonths >= 3 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
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
      {planStatus === "failed" && <DashboardFailed />}
      {planStatus === "pending_review" && <DashboardPending />}
      {planStatus === "delivered" && <DashboardDelivered />}
    </div>
  );
}
