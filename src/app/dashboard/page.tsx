"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { recordedDebt } from "@/lib/calculations/financial";
import { isTrialActive } from "@/lib/entitlements";
import { usePlanStore } from "@/stores/plan-store";
import { ApprovalStatusBanner } from "@/components/app/ApprovalStatusBanner";
import { HouseholdCard } from "@/components/app/HouseholdCard";
import { MeetingHistory } from "@/components/app/MeetingHistory";
import { ReviewReminder } from "@/components/app/ReviewReminder";
import { ClubCard } from "@/components/app/ClubCard";
import { MASTERY_PUBLIC } from "@/lib/config/launch-surface";
import { PendingReviewBanner } from "@/components/app/PendingReviewBanner";
import { PlanStaleBanner } from "@/components/app/PlanStaleBanner";
import { loadChart } from "@/components/charts/load-chart";
import { lineSeries } from "@/lib/net-worth/tracking";
import type { NetWorthSnapshotRow } from "@/types/tracking";
import { MotivationStrip } from "@/components/tracking/MotivationStrip";
import { TrackingLoop } from "@/components/app/TrackingLoop";
import { SetupChecklist } from "@/components/app/SetupChecklist";
import { watchJson } from "@/lib/client/api-cache";
import type { SetupStatus } from "@/lib/onboarding/setup-status";
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

const DebtBreakdownChart = loadChart(
  () => import("@/components/charts/DebtBreakdownChart").then((m) => m.DebtBreakdownChart),
  "h-[220px] w-full",
);
const ScoreBreakdownChart = loadChart(
  () => import("@/components/charts/ScoreBreakdownChart").then((m) => m.ScoreBreakdownChart),
  "h-[300px] w-full",
);
const NetWorthHistoryChart = loadChart(
  () => import("@/components/charts/NetWorthHistoryChart").then((m) => m.NetWorthHistoryChart),
  "h-[260px] w-full",
);

let cachedNow = 0;

function subscribeMinute(onChange: () => void) {
  const id = setInterval(() => {
    cachedNow = Date.now();
    onChange();
  }, 60_000);
  return () => clearInterval(id);
}

function snapshotNow() {
  if (cachedNow === 0 && typeof window !== "undefined") cachedNow = Date.now();
  return cachedNow;
}

function fmtSnapshotValue(n: number | null, prefix = "$"): string {
  if (n == null) return "--";
  if (prefix === "$") {
    const abs = Math.abs(n);
    const body =
      abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? Math.round(abs).toLocaleString() : abs.toLocaleString();
    return n < 0 ? `-$${body}` : `$${body}`;
  }
  return String(n);
}

function fmtKpi(n: number | null | undefined): string {
  if (n == null) return "--";
  const abs = Math.abs(n);
  const body = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(0)}K` : abs.toLocaleString();
  return n < 0 ? `-$${body}` : `$${body}`;
}

function DashGlassCard({ label, value, unit, accent, note }: { label: string; value: string; unit?: string; accent?: string; note?: string }) {
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
      {note && <p className="mt-1 font-body text-[10px] text-white/40">{note}</p>}
    </div>
  );
}

function NetWorthStrip({ snapshotNetWorth = null }: { snapshotNetWorth?: number | null }) {
  const plan = usePlanStore((s) => s.plan);
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const prePlanData = usePlanStore((s) => s.prePlanData);

  const diag = rawPlanData?.financial_health_diagnostic as Record<string, unknown> | undefined;
  const debtPlan = rawPlanData?.debt_elimination_plan as Record<string, unknown> | undefined;
  const planDebt = typeof debtPlan?.total_debt === "number" ? debtPlan.total_debt : null;
  const liveInv = prePlanData?.totalInvestments;
  const liveFix = prePlanData?.totalFixedAssets;
  const hasLiveAssets = liveInv != null || liveFix != null;
  const liveAssets = (liveInv ?? 0) + (liveFix ?? 0);

  let netWorthDisplay = "--";
  let totalAssetsDisplay = "--";
  let totalDebtDisplay = "--";
  let cashFlowDisplay = "--";
  let totalDebtNum = 0;
  let emergencyMonths: number | null = null;
  let figureNote: string | undefined;
  let cashFlowNote: string | undefined;
  let emergencyNote: string | undefined;

  if (plan) {
    totalDebtNum = recordedDebt(prePlanData?.totalDebt ?? 0, planDebt);
    const reportNetWorth = (diag?.net_worth as number) ?? null;
    const totalAssets = hasLiveAssets
      ? liveAssets
      : reportNetWorth != null
        ? reportNetWorth + totalDebtNum
        : null;
    netWorthDisplay = hasLiveAssets ? fmtKpi(liveAssets - totalDebtNum) : (plan.netWorth ?? "--");
    totalAssetsDisplay = fmtKpi(totalAssets);
    totalDebtDisplay = fmtKpi(totalDebtNum);
    cashFlowDisplay = plan.monthlyCashFlow ?? "--";
    emergencyMonths = (diag?.emergency_fund_months as number) ?? null;
    figureNote = hasLiveAssets ? "Today" : "From your last report";
    cashFlowNote = "From your last report";
    emergencyNote = "From your last report";
  } else {
    const debt = prePlanData?.totalDebt ?? null;
    totalDebtNum = debt ?? 0;
    if (hasLiveAssets) netWorthDisplay = fmtKpi(liveAssets - totalDebtNum);
    else if (snapshotNetWorth != null && Number.isFinite(snapshotNetWorth)) {
      netWorthDisplay = fmtKpi(snapshotNetWorth);
    }
    totalAssetsDisplay = hasLiveAssets ? fmtKpi(liveAssets) : "--";
    totalDebtDisplay = debt != null ? fmtKpi(debt) : "--";
    if (prePlanData?.annualIncome != null && prePlanData.monthlyExpenses != null) {
      cashFlowDisplay = fmtKpi(prePlanData.annualIncome / 12 - prePlanData.monthlyExpenses);
    }
    emergencyMonths = prePlanData?.emergencyFundMonths ?? null;
  }

  const debtAccent = totalDebtDisplay !== "--" && totalDebtNum > 0 ? "#ef4444" : "#c9aa71";
  const emergencyColor =
    emergencyMonths != null && emergencyMonths >= 6
      ? "#10b981"
      : emergencyMonths != null && emergencyMonths >= 3
        ? "#f59e0b"
        : "#c9aa71";

  return (
    <div data-tour="dashboard-net-worth" className="rounded-xl bg-[#0f1923] p-6 shadow-lg md:p-8">
      <div className="flex flex-col items-center gap-6 md:flex-row">
        <div className="flex shrink-0 flex-col items-center">
          <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/50">
            Net Worth
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums text-[#10b981] sm:text-5xl">
            {netWorthDisplay}
          </p>
          {figureNote && <p className="mt-1 font-body text-[10px] text-white/40">{figureNote}</p>}
        </div>

        <div className="hidden h-20 w-px bg-white/10 md:block" />

        <div className="grid w-full flex-1 grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          <DashGlassCard label="Cash Flow" value={cashFlowDisplay} unit="/mo" accent="#818cf8" note={cashFlowNote} />
          <DashGlassCard label="Total Assets" value={totalAssetsDisplay} note={figureNote} />
          <DashGlassCard label="Total Debt" value={totalDebtDisplay} accent={debtAccent} note={figureNote} />
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.06] p-5">
            <p className="mb-2 font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/40">
              Emergency Fund
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-[26px]"
                style={{ color: emergencyColor }}
              >
                {emergencyMonths != null ? emergencyMonths.toFixed(1) : "--"}
              </span>
              {emergencyMonths != null && (
                <span className="font-[family-name:var(--font-body)] text-xs text-white/35">mo</span>
              )}
            </div>
            {emergencyNote && <p className="mt-1 font-body text-[10px] text-white/40">{emergencyNote}</p>}
            {emergencyMonths != null && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
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

function DashboardGenerating() {
  const prePlanData = usePlanStore((s) => s.prePlanData);
  const user = usePlanStore((s) => s.user);
  const [loopRefresh, setLoopRefresh] = useState(0);
  const reportAvailable =
    user?.tier === "progress" || user?.tier === "mastery" || isTrialActive(user?.trialEndsAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <Loader2 className="size-5 shrink-0 animate-spin text-[var(--emerald)]" aria-hidden />
        <p className="font-[family-name:var(--font-body)] text-[14px] text-[var(--text-secondary)]">
          Your Progress Report is being generated in the background. Some metrics will update when
          ready.
        </p>
      </div>

      <NetWorthStrip />
      <TrackingLoop reportAvailable={reportAvailable} onLogged={() => setLoopRefresh((n) => n + 1)} />
      <MotivationStrip refreshToken={loopRefresh} />

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
      <NetWorthStrip snapshotNetWorth={latestNetWorth} />
      <TrackingLoop reportAvailable={reportAvailable} />

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
            <div key={item.id} className="cv-row flex items-start gap-2">
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
                  +{section.actionItems.length - 2} more notes
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const chartRowClass =
  "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2";

function ChartGrid() {
  return (
    <div className={chartRowClass}>
      <DebtBreakdownChart />
      <ScoreBreakdownChart />
    </div>
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

      <NetWorthStrip />
      <MotivationStrip />
      <ChartGrid />

      {plan.sections.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
            Report Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.sections.map((section) => (
              <div key={section.id} className="cv-row">
                <ExpandablePlanSection section={section} />
              </div>
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
  const now = useSyncExternalStore(subscribeMinute, snapshotNow, () => 0);
  const [loopRefresh, setLoopRefresh] = useState(0);

  if (!plan) return null;

  const daysSinceDelivery = plan.deliveredAt
    ? Math.floor((now - new Date(plan.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return (
    <div className="space-y-8">
      {now > 0 && daysSinceDelivery <= 7 && (
        <ApprovalStatusBanner status="delivered" planId={plan.id} />
      )}

      <NetWorthStrip />
      <TrackingLoop reportAvailable onLogged={() => setLoopRefresh((n) => n + 1)} />
      <MotivationStrip refreshToken={loopRefresh} />
      <ChartGrid />

      {plan.sections.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-4">
            Report Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.sections.map((section) => (
              <div key={section.id} className="cv-row">
                <ExpandablePlanSection section={section} />
              </div>
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

function DashboardSetup() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void watchJson<SetupStatus>("/api/setup/status", (data) => {
      if (!cancelled && typeof data.planSet === "boolean") setStatus(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status ? <SetupChecklist status={status} /> : null;
}

export default function DashboardPage() {
  const { planStatus, plan, isLoading } = usePlanStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="font-body text-sm text-[var(--text-muted)]">Loading your dashboard</p>
        <div className="skeleton h-36 w-full" />
        <div className="skeleton h-56 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PendingReviewBanner />
      <PlanStaleBanner />
      <div className="mb-6">
        <h1 data-tour="page-dashboard" className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          Dashboard
        </h1>
      </div>
      <DashboardSetup />

      {planStatus === "none" && <DashboardNoPlan />}
      {planStatus === "generating" && !plan && <DashboardGenerating />}
      {planStatus === "generating" && plan && <DashboardDelivered />}
      {planStatus === "failed" && <DashboardFailed />}
      {planStatus === "pending_review" && <DashboardPending />}
      {planStatus === "delivered" && <DashboardDelivered />}
    </div>
  );
}
