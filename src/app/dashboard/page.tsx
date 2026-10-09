"use client";

import { useEffect, useState } from "react";
import { recordedDebt } from "@/lib/calculations/financial";
import { isTrialActive } from "@/lib/entitlements";
import { usePlanStore, type PrePlanData } from "@/stores/plan-store";
import { HealthScore } from "@/components/app/HealthScore";
import { ApprovalStatusBanner } from "@/components/app/ApprovalStatusBanner";
import { HouseholdCard } from "@/components/app/HouseholdCard";
import { MeetingHistory } from "@/components/app/MeetingHistory";
import { ReviewReminder } from "@/components/app/ReviewReminder";
import { ClubCard } from "@/components/app/ClubCard";
import { MASTERY_PUBLIC } from "@/lib/config/launch-surface";
import { PendingReviewBanner } from "@/components/app/PendingReviewBanner";
import { PlanStaleBanner } from "@/components/app/PlanStaleBanner";
import { RetirementIncomeChart } from "@/components/charts/RetirementIncomeChart";
import { RetirementProgressBar } from "@/components/charts/RetirementProgressBar";
import { DebtBreakdownChart } from "@/components/charts/DebtBreakdownChart";
import { ScoreBreakdownChart } from "@/components/charts/ScoreBreakdownChart";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { NetWorthHistoryChart } from "@/components/charts/NetWorthHistoryChart";
import { lineSeries } from "@/lib/net-worth/tracking";
import type { NetWorthSnapshotRow } from "@/types/tracking";
import { NetWorthTimeline } from "@/components/charts/NetWorthTimeline";
import { MotivationStrip } from "@/components/tracking/MotivationStrip";
import {
  FileText,
  ArrowRight,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Banknote,
  Wallet,
  Target,
} from "lucide-react";
import Link from "next/link";

const GENERATING_CHART_PLACEHOLDERS = [
  {
    title: "Retirement Income Sources",
    subtitle: "Estimated monthly income at retirement",
  },
  {
    title: "Retirement Readiness",
    subtitle: "Current trajectory vs. target retirement number",
  },
  {
    title: "Debt Breakdown",
    subtitle: "Balances and payoff strategy",
  },
  {
    title: "Illustrative mix",
    subtitle: "Example asset-class mix from your Progress Report",
  },
  {
    title: "Net Worth Trajectory",
    subtitle: "Projected milestones by age",
  },
  {
    title: "Health Score Breakdown",
    subtitle: "Performance across financial dimensions",
  },
] as const;

function fmtSnapshotValue(n: number | null, prefix = "$"): string {
  if (n == null) return "--";
  if (prefix === "$") {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n).toLocaleString()}`;
    return `$${n.toLocaleString()}`;
  }
  return String(n);
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
        <span className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-[26px]" style={{ color: accent ?? "#c9aa71" }}>
          {value}
        </span>
        {unit && <span className="font-[family-name:var(--font-body)] text-xs text-white/35">{unit}</span>}
      </div>
    </div>
  );
}

function ChartPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
        {subtitle}
      </p>
      <div
        className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--warm-200)] bg-[var(--warm-50)]/50 px-4 py-8"
        aria-hidden
      >
        <Loader2 className="mb-2 size-6 animate-spin text-[var(--emerald)] opacity-70" />
        <p className="font-[family-name:var(--font-body)] text-center text-xs font-medium text-[var(--text-secondary)]">
          Generating…
        </p>
        <p className="mt-1 font-[family-name:var(--font-body)] text-center text-[11px] text-[var(--text-muted)]">
          Available after your Progress Report is ready
        </p>
      </div>
    </div>
  );
}

function useLiveHealthScore() {
  const [liveScore, setLiveScore] = useState<{ score: number; delta90: number | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health-score", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.score != null) {
          setLiveScore({ score: Number(d.score), delta90: d.delta90 ?? null });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return liveScore;
}

function PrePlanKPIStrip({
  data,
  snapshotNetWorth = null,
}: {
  data: PrePlanData | null;
  snapshotNetWorth?: number | null;
}) {
  const liveScore = useLiveHealthScore();
  const inv = data?.totalInvestments;
  const fix = data?.totalFixedAssets;
  const totalAssetSum = (inv ?? 0) + (fix ?? 0);
  const hasAssetFigure = inv != null || fix != null;

  const totalDebtNum = data?.totalDebt ?? null;
  const debtForPicture = totalDebtNum ?? 0;
  let netWorthDisplay = "--";
  if (hasAssetFigure) {
    netWorthDisplay = fmtKpi(totalAssetSum - debtForPicture);
  } else if (snapshotNetWorth != null && Number.isFinite(snapshotNetWorth)) {
    netWorthDisplay = fmtKpi(snapshotNetWorth);
  }

  let cashFlowDisplay = "--";
  if (data?.annualIncome != null && data?.monthlyExpenses != null) {
    cashFlowDisplay = fmtKpi(data.annualIncome / 12 - data.monthlyExpenses);
  }

  const totalAssetsDisplay = hasAssetFigure ? fmtKpi(totalAssetSum) : "--";
  const totalDebtDisplay = totalDebtNum != null ? fmtKpi(totalDebtNum) : "--";
  const emergencyMonths = data?.emergencyFundMonths ?? null;

  return (
    <div className="rounded-xl bg-[#0f1923] p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex flex-col items-center shrink-0">
          {liveScore != null ? (
            <HealthScore score={liveScore.score} size="sm" />
          ) : (
            <div className="flex size-[80px] items-center justify-center rounded-full border-2 border-dashed border-white/25 bg-white/[0.04]">
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-white/35">
                --
              </span>
            </div>
          )}
          <p className="font-[family-name:var(--font-display)] font-semibold text-[11px] uppercase tracking-wider text-white/50 mt-2">
            Health Score
          </p>
          {liveScore?.delta90 != null && (
            <p className="mt-0.5 font-[family-name:var(--font-body)] text-[10px] text-white/60">
              90-day {liveScore.delta90 >= 0 ? "+" : ""}
              {liveScore.delta90}
            </p>
          )}
        </div>

        <div className="hidden md:block w-px h-20 bg-white/10" />

        <div className="flex-1 grid w-full grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
          <DashGlassCard label="Net Worth" value={netWorthDisplay} accent="#10b981" />
          <DashGlassCard label="Cash Flow" value={cashFlowDisplay} unit="/mo" accent="#818cf8" />
          <DashGlassCard label="Total Assets" value={totalAssetsDisplay} />
          <DashGlassCard
            label="Total Debt"
            value={totalDebtDisplay}
            accent={totalDebtNum != null && totalDebtNum > 0 ? "#ef4444" : "#c9aa71"}
          />
          <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-5">
            <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/40 mb-2">
              Emergency Fund
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-[26px]"
                style={{
                  color:
                    emergencyMonths != null && emergencyMonths >= 6
                      ? "#10b981"
                      : emergencyMonths != null && emergencyMonths >= 3
                        ? "#f59e0b"
                        : "#c9aa71",
                }}
              >
                {emergencyMonths != null ? emergencyMonths.toFixed(1) : "--"}
              </span>
              {emergencyMonths != null && (
                <span className="font-[family-name:var(--font-body)] text-xs text-white/35">mo</span>
              )}
            </div>
            {emergencyMonths != null && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((emergencyMonths / 6) * 100, 100)}%`,
                      background:
                        emergencyMonths >= 6 ? "#10b981" : emergencyMonths >= 3 ? "#f59e0b" : "#ef4444",
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

function DashboardGenerating() {
  const prePlanData = usePlanStore((s) => s.prePlanData);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <Loader2 className="size-5 shrink-0 animate-spin text-[var(--emerald)]" aria-hidden />
        <p className="font-[family-name:var(--font-body)] text-[14px] text-[var(--text-secondary)]">
          Your Progress Report is being generated in the background. Some metrics will update when
          ready.
        </p>
      </div>

      <PrePlanKPIStrip data={prePlanData} />
      <MotivationStrip />

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {GENERATING_CHART_PLACEHOLDERS.slice(0, 2).map((c) => (
            <ChartPlaceholder key={c.title} title={c.title} subtitle={c.subtitle} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {GENERATING_CHART_PLACEHOLDERS.slice(2, 4).map((c) => (
            <ChartPlaceholder key={c.title} title={c.title} subtitle={c.subtitle} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {GENERATING_CHART_PLACEHOLDERS.slice(4, 6).map((c) => (
            <ChartPlaceholder key={c.title} title={c.title} subtitle={c.subtitle} />
          ))}
        </div>
      </div>

      {prePlanData && (
        <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-4">
            Your Financial Snapshot
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Annual Income
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {fmtSnapshotValue(prePlanData.annualIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Monthly Expenses
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {fmtSnapshotValue(prePlanData.monthlyExpenses)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Investments
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--emerald)] tabular-nums">
                {fmtSnapshotValue(prePlanData.totalInvestments)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Total Debt
              </p>
              <p
                className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums"
                style={{
                  color:
                    prePlanData.totalDebt && prePlanData.totalDebt > 0 ? "var(--error)" : "var(--text-primary)",
                }}
              >
                {fmtSnapshotValue(prePlanData.totalDebt ?? 0)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Emergency Fund
              </p>
              <p
                className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums"
                style={{
                  color:
                    prePlanData.emergencyFundMonths != null && prePlanData.emergencyFundMonths >= 3
                      ? "var(--emerald)"
                      : "var(--error)",
                }}
              >
                {prePlanData.emergencyFundMonths != null
                  ? `${prePlanData.emergencyFundMonths.toFixed(1)} mo`
                  : "--"}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--warm-50)] p-4">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Target Retirement
              </p>
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

const TRACKING_LINKS = [
  { href: "/dashboard/cash-flow", label: "Cash Flow", icon: Banknote },
  { href: "/dashboard/assets", label: "Net Worth", icon: Wallet },
  { href: "/dashboard/goals", label: "Goals", icon: Target },
] as const;

function DashboardNoPlan() {
  const prePlanData = usePlanStore((s) => s.prePlanData);
  const user = usePlanStore((s) => s.user);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshotRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/net-worth/snapshots", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        setSnapshots((json.snapshots ?? []) as NetWorthSnapshotRow[]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const series = lineSeries(snapshots);
  const latestNetWorth = series.length > 0 ? series[series.length - 1].netWorth : null;
  const reportAvailable =
    user?.tier === "progress" ||
    user?.tier === "mastery" ||
    isTrialActive(user?.trialEndsAt);

  return (
    <div className="space-y-6">
      <PrePlanKPIStrip data={prePlanData} snapshotNetWorth={latestNetWorth} />
      <MotivationStrip />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TRACKING_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-lg border border-[var(--warm-200)] bg-white px-4 py-3 transition-colors hover:border-[var(--emerald)]"
          >
            <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
              <item.icon className="size-4 text-[var(--emerald)]" />
              {item.label}
            </span>
            <ArrowRight className="size-4 text-[var(--text-muted)]" />
          </Link>
        ))}
      </div>

      <NetWorthHistoryChart data={series} showToggles />

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--warm-200)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
            Progress Report
          </h2>
          <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
            {reportAvailable
              ? "A Progress Report is an educational snapshot of your trajectory. Your Health Score, net worth, and streaks are already here. This is educational information, not financial advice."
              : "Progress Reports are included on Progress. Your Health Score, net worth, and streaks stay free on Pulse."}
          </p>
        </div>
        <Link
          href={reportAvailable ? "/onboarding" : "/dashboard/settings?tab=subscription"}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-5 py-2.5 font-[family-name:var(--font-display)] text-sm font-semibold text-white transition-colors hover:bg-[#059669]"
        >
          {reportAvailable ? "Start fact-find" : "See Progress"}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
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
          Progress report generation failed
        </h2>
        <p className="font-[family-name:var(--font-body)] text-[14px] text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Something went wrong while generating your Progress Report. This is usually temporary — please try again.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-[family-name:var(--font-display)] text-[14px] font-semibold text-white transition-colors hover:bg-[#059669] disabled:opacity-60"
        >
          {retrying ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {retrying ? "Retrying..." : "Retry Report Generation"}
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

function KPIStrip({ plan }: { plan: NonNullable<ReturnType<typeof usePlanStore.getState>["plan"]> }) {
  const liveScore = useLiveHealthScore();
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const prePlanData = usePlanStore((s) => s.prePlanData);
  const diag = rawPlanData?.financial_health_diagnostic as Record<string, unknown> | undefined;
  const debtPlan = rawPlanData?.debt_elimination_plan as Record<string, unknown> | undefined;

  const planDebt = typeof debtPlan?.total_debt === "number" ? debtPlan.total_debt : null;
  const liveInv = prePlanData?.totalInvestments ?? 0;
  const liveFix = prePlanData?.totalFixedAssets ?? 0;
  const liveAssets = liveInv + liveFix;
  const hasLiveAssets =
    prePlanData?.totalInvestments != null || prePlanData?.totalFixedAssets != null;

  const totalDebt = recordedDebt(prePlanData?.totalDebt ?? 0, planDebt);
  const netWorthNum = (diag?.net_worth as number) ?? null;
  const totalAssets = hasLiveAssets
    ? liveAssets
    : netWorthNum != null
      ? netWorthNum + totalDebt
      : null;
  const netWorthDisplay = hasLiveAssets
    ? fmtKpi(liveAssets - totalDebt)
    : (plan.netWorth ?? "--");
  const totalAssetsDisplay = hasLiveAssets ? fmtKpi(totalAssets) : fmtKpi(totalAssets);
  const emergencyMonths = (diag?.emergency_fund_months as number) ?? null;

  return (
    <div className="rounded-xl bg-[#0f1923] p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {(liveScore?.score ?? plan.healthScore) > 0 && (
          <div className="flex flex-col items-center shrink-0">
            <HealthScore score={liveScore?.score ?? plan.healthScore} size="lg" />
            <p className="font-[family-name:var(--font-display)] font-semibold text-[11px] uppercase tracking-wider text-white/50 mt-2">
              Health Score
            </p>
            {liveScore?.delta90 != null && (
              <p className="mt-1 font-body text-xs text-white/60">
                90-day {liveScore.delta90 >= 0 ? "+" : ""}
                {liveScore.delta90}
              </p>
            )}
          </div>
        )}

        <div className="hidden md:block w-px h-20 bg-white/10" />

        <div className="flex-1 grid w-full grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
          <DashGlassCard label="Net Worth" value={netWorthDisplay} accent="#10b981" />
          <DashGlassCard label="Cash Flow" value={plan.monthlyCashFlow ?? "--"} unit="/mo" accent="#818cf8" />
          <DashGlassCard label="Total Assets" value={totalAssetsDisplay} />
          <DashGlassCard label="Total Debt" value={fmtKpi(totalDebt)} accent={totalDebt > 0 ? "#ef4444" : "#c9aa71"} />
          <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-5">
            <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/40 mb-2">
              Emergency Fund
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-[26px]" style={{ color: emergencyMonths != null && emergencyMonths >= 6 ? "#10b981" : emergencyMonths != null && emergencyMonths >= 3 ? "#f59e0b" : "#c9aa71" }}>
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

const chartRowClass =
  "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2";

function ChartGrid() {
  return (
    <>
      <div className={`${chartRowClass} min-h-[240px]`}>
        <RetirementIncomeChart />
        <RetirementProgressBar />
      </div>

      <div className={chartRowClass}>
        <DebtBreakdownChart />
        <AssetAllocationChart />
      </div>

      <div className={chartRowClass}>
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
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--emerald-dark)]">
            Your Progress Report is ready to view
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mt-0.5">
            View your report while it finishes preparing
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--emerald)] group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <KPIStrip plan={plan} />
      <MotivationStrip />
      <ChartGrid />

      {plan.sections.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
            Report Sections
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
      <MotivationStrip />
      <ChartGrid />

      {plan.sections.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
            Report Sections
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
        {MASTERY_PUBLIC && <ClubCard />}
      </div>

      {MASTERY_PUBLIC && marketContext && (
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
          <div className="flex flex-wrap gap-4">
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
  const { planStatus, plan, isLoading } = usePlanStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-44 w-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PendingReviewBanner />
      <PlanStaleBanner />
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          Dashboard
        </h1>
      </div>

      {planStatus === "none" && <DashboardNoPlan />}
      {planStatus === "generating" && !plan && <DashboardGenerating />}
      {planStatus === "generating" && plan && <DashboardDelivered />}
      {planStatus === "failed" && <DashboardFailed />}
      {planStatus === "pending_review" && <DashboardPending />}
      {planStatus === "delivered" && <DashboardDelivered />}
    </div>
  );
}
