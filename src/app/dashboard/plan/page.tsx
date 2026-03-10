"use client";

import { useEffect, useState, useRef } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { PlanSectionComponent } from "@/components/app/PlanSectionComponent";
import { EmptyState } from "@/components/app/EmptyState";
import { HealthScore } from "@/components/app/HealthScore";
import { FinancialCard } from "@/components/app/FinancialCard";
import { RetirementIncomeChart } from "@/components/charts/RetirementIncomeChart";
import { RetirementProgressBar } from "@/components/charts/RetirementProgressBar";
import { DebtBreakdownChart } from "@/components/charts/DebtBreakdownChart";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { NetWorthTimeline } from "@/components/charts/NetWorthTimeline";
import { ScoreBreakdownChart } from "@/components/charts/ScoreBreakdownChart";
import {
  Check,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Shield,
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

/* ---------- Status Timeline ---------- */

type TimelineStep = { label: string; status: "complete" | "active" | "pending" };

function getTimelineSteps(planStatus: string): TimelineStep[] {
  if (planStatus === "delivered") {
    return [
      { label: "Plan Generated", status: "complete" },
      { label: "CIM Review", status: "complete" },
      { label: "Delivered", status: "complete" },
    ];
  }
  if (planStatus === "pending_review") {
    return [
      { label: "Plan Generated", status: "complete" },
      { label: "CIM Review", status: "active" },
      { label: "Delivered", status: "pending" },
    ];
  }
  if (planStatus === "generating") {
    return [
      { label: "Generating Plan", status: "active" },
      { label: "CIM Review", status: "pending" },
      { label: "Delivered", status: "pending" },
    ];
  }
  return [];
}

function StatusTimeline({ planStatus }: { planStatus: string }) {
  const steps = getTimelineSteps(planStatus);
  if (steps.length === 0) return null;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                  step.status === "complete" && "border-[var(--emerald)] bg-[var(--emerald)]",
                  step.status === "active" && "border-amber-400 bg-amber-50",
                  step.status === "pending" && "border-[var(--warm-200)] bg-[var(--warm-50)]",
                )}
              >
                {step.status === "complete" && <Check className="size-4 text-white" strokeWidth={3} />}
                {step.status === "active" && <Loader2 className="size-4 text-amber-600 animate-spin" />}
                {step.status === "pending" && <Clock className="size-4 text-[var(--text-muted)]" />}
              </div>
              <span
                className={cn(
                  "font-[family-name:var(--font-body)] text-xs font-medium text-center",
                  step.status === "complete" && "text-[var(--emerald)]",
                  step.status === "active" && "text-amber-600",
                  step.status === "pending" && "text-[var(--text-muted)]",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3 mt-[-20px]">
                <div
                  className={cn(
                    "h-0.5 w-full rounded-full",
                    step.status === "complete" ? "bg-[var(--emerald)]" : "bg-[var(--warm-200)]",
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Generating State ---------- */

function PlanGenerating() {
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
      <StatusTimeline planStatus="generating" />
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
                  isVisible ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0",
                )}
                style={isVisible ? { animation: "checklist-enter 400ms ease-out both" } : undefined}
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
        <p className="font-body text-[14px] text-[var(--text-muted)]">
          This usually takes a few minutes. Once generated, a CIM-designated professional will review your plan.
        </p>
      </div>
    </div>
  );
}

/* ---------- No Plan State ---------- */

function PlanNone() {
  return (
    <EmptyState
      icon={FileText}
      title="No financial plan yet"
      description="Complete the onboarding process to generate your personalized financial plan, reviewed by a CIM professional."
      ctaLabel="Complete Setup"
      ctaHref="/onboarding"
    />
  );
}

/* ---------- Plan KPI Strip (shared) ---------- */

function PlanKPIStrip({ plan }: { plan: NonNullable<ReturnType<typeof usePlanStore.getState>["plan"]> }) {
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
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        <FinancialCard label="NET WORTH" value={plan.netWorth ?? "--"} className="bg-gradient-to-br from-white to-emerald-50/40" />
        <FinancialCard label="MONTHLY CASH FLOW" value={plan.monthlyCashFlow ?? "--"} className="bg-gradient-to-br from-white to-blue-50/40" />
        <FinancialCard label="SAVINGS RATE" value={plan.savingsRate ?? "--"} className="bg-gradient-to-br from-white to-indigo-50/40" />
        <FinancialCard label="RETIREMENT GAP" value={plan.retirementGap ?? "--"} className="bg-gradient-to-br from-white to-amber-50/40" />
      </div>
    </div>
  );
}

/* ---------- Plan Charts Row ---------- */

function PlanCharts() {
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

/* ---------- Pending Review State ---------- */

function PlanPendingReview() {
  const { plan } = usePlanStore();

  if (!plan) {
    return (
      <div className="space-y-6">
        <StatusTimeline planStatus="pending_review" />
        <div className="skeleton h-44 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StatusTimeline planStatus="pending_review" />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-amber-800">
            Under CIM Professional Review
          </p>
          <p className="font-[family-name:var(--font-body)] text-sm text-amber-700 mt-1">
            Your plan has been generated and is now being reviewed by a CIM-designated professional.
            Estimated delivery: {plan.estimatedDelivery ?? "Within 24 hours"}.
          </p>
        </div>
      </div>

      <PlanKPIStrip plan={plan} />
      <PlanCharts />

      {plan.sections.length > 0 && (
        <div className="bg-white border border-[var(--warm-200)] rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">
              Plan Preview
            </h2>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-1">
              Section details will be finalized after CIM review
            </p>
          </div>
          {plan.sections.map((section) => (
            <PlanSectionComponent key={section.id} section={section} defaultExpanded={false} />
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <button
          disabled
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] text-[var(--text-muted)] font-[family-name:var(--font-display)] text-sm font-semibold cursor-not-allowed"
          title="Available after CIM review"
        >
          <Download className="w-4 h-4" />
          Download PDF
          <span className="text-xs font-normal">(after review)</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- Delivered State ---------- */

function PlanDelivered() {
  const { plan } = usePlanStore();
  const [activeSectionId, setActiveSectionId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (plan?.sections.length && !activeSectionId) {
      setActiveSectionId(plan.sections[0].id);
    }
  }, [plan, activeSectionId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.getAttribute("data-section-id") || "");
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [plan?.sections]);

  if (!plan) return null;

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = sectionRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function handleDownloadPDF() {
    if (!plan) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/plan/${plan.id}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finova-financial-plan-${plan.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail -- could add toast
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <StatusTimeline planStatus="delivered" />

      <PlanKPIStrip plan={plan} />
      <PlanCharts />

      {/* Section Navigation + Content */}
      <div className="flex gap-8">
        {/* Sticky sidebar nav */}
        <div className="w-[220px] shrink-0 sticky top-8 self-start hidden lg:block">
          <p className="font-[family-name:var(--font-body)] font-medium text-[12px] uppercase text-[var(--text-muted)] tracking-wider mb-2">
            Plan Sections
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mb-1">
            Generated {new Date(plan.createdAt).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <div className="flex items-center gap-1.5 mb-6">
            <Check className="w-3.5 h-3.5 text-[var(--emerald)]" />
            <span className="font-[family-name:var(--font-body)] text-xs text-[var(--emerald)] font-medium">
              CIM Reviewed
            </span>
          </div>
          <nav className="space-y-0.5 mb-8">
            {plan.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-[family-name:var(--font-body)] transition-colors relative",
                  activeSectionId === section.id
                    ? "text-[var(--text-primary)] font-semibold bg-[var(--warm-100)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--warm-50)]",
                )}
              >
                {activeSectionId === section.id && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--emerald)] rounded-r" />
                )}
                {section.title}
              </button>
            ))}
          </nav>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? "Generating..." : "Download PDF"}
          </button>

          <Link
            href={`/dashboard/plan/${plan.id}/walkthrough`}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            AI Walkthrough
          </Link>
        </div>

        {/* Sections */}
        <div className="flex-1 min-w-0">
          {/* Mobile nav */}
          <div className="lg:hidden mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--emerald)]" />
              <span className="font-[family-name:var(--font-body)] text-xs text-[var(--emerald)] font-medium">
                CIM Reviewed
              </span>
              <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] ml-auto">
                {new Date(plan.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <select
              value={activeSectionId}
              onChange={(e) => scrollToSection(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--warm-200)] bg-white text-sm font-[family-name:var(--font-body)] text-[var(--text-primary)]"
            >
              {plan.sections.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </button>
              <Link
                href={`/dashboard/plan/${plan.id}/walkthrough`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                Walkthrough
              </Link>
            </div>
          </div>

          {plan.sections.map((section) => (
            <div
              key={section.id}
              ref={(el) => { if (el) sectionRefs.current.set(section.id, el); }}
              data-section-id={section.id}
            >
              <PlanSectionComponent section={section} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function PlanHubPage() {
  const { planStatus } = usePlanStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          My Plan
        </h1>
      </div>

      {planStatus === "none" && <PlanNone />}
      {planStatus === "generating" && <PlanGenerating />}
      {planStatus === "pending_review" && <PlanPendingReview />}
      {planStatus === "delivered" && <PlanDelivered />}
    </div>
  );
}
