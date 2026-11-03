"use client";

import { useEffect, useState, useRef } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { PlanSectionComponent } from "@/components/app/PlanSectionComponent";
import { EmptyState } from "@/components/app/EmptyState";
import { HealthScore } from "@/components/app/HealthScore";
import { DebtBreakdownChart } from "@/components/charts/DebtBreakdownChart";
import { ScoreBreakdownChart } from "@/components/charts/ScoreBreakdownChart";
import {
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  MessageCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ---------- Status Timeline ---------- */

type TimelineStep = { label: string; status: "complete" | "active" | "pending" };

function getTimelineSteps(planStatus: string): TimelineStep[] {
  if (planStatus === "delivered") {
    return [
      { label: "Report generated", status: "complete" },
      { label: "Ready", status: "complete" },
    ];
  }
  if (planStatus === "pending_review") {
    return [
      { label: "Report generated", status: "complete" },
      { label: "Preparing", status: "active" },
    ];
  }
  if (planStatus === "generating") {
    return [
      { label: "Generating report", status: "active" },
      { label: "Ready", status: "pending" },
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
  return (
    <div className="space-y-6">
      <StatusTimeline planStatus="generating" />
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-8">
        <div className="flex items-start gap-3">
          <Loader2 className="size-5 shrink-0 animate-spin text-[var(--emerald)] mt-0.5" aria-hidden />
          <div>
            <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)] mb-2">
              Your Progress Report is being generated
            </h2>
            <p className="font-body text-[14px] text-[var(--text-secondary)] leading-relaxed">
              Your Progress Report is currently being generated. You&apos;ll be able to view and download it here once it&apos;s
              ready. Your Dashboard shows live snapshot metrics while generation runs in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- No Plan State ---------- */

function PlanNone() {
  return (
    <EmptyState
      icon={FileText}
      title="No Progress Report yet"
      description="Complete onboarding to generate your Progress Report — an educational snapshot of your trajectory and options. This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes."
      ctaLabel="Complete Setup"
      ctaHref="/onboarding"
    />
  );
}

/* ---------- Plan KPI Strip (planning-focused, dark hero) ---------- */

function PlanKPIStrip({ plan }: { plan: NonNullable<ReturnType<typeof usePlanStore.getState>["plan"]> }) {
  return (
    <div className="rounded-xl bg-[#0f1923] p-6 md:p-8 shadow-lg">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
        {plan.healthScore > 0 && (
          <div className="flex shrink-0 flex-col items-center">
            <HealthScore score={plan.healthScore} size="lg" />
            <p className="font-[family-name:var(--font-display)] font-semibold text-[11px] uppercase tracking-wider text-white/50 mt-2">
              Health Score
            </p>
            <p className="font-body text-[10px] text-white/40">In this report</p>
          </div>
        )}
        <p className="font-body text-sm leading-relaxed text-white/70">
          The sections below explain the figures in this report. They describe what was entered. They are not a target, a mix for these accounts, or a savings instruction. Today&apos;s score and net worth are on the dashboard. Net worth in this report is the figure from the day it was generated. It can differ from the live number on Net Worth.
        </p>
      </div>
    </div>
  );
}

/* ---------- Plan Charts Row ---------- */

function PlanCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2">
      <DebtBreakdownChart />
      <ScoreBreakdownChart />
    </div>
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3 flex-1">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-amber-800">
              Preparing your Progress Report
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-amber-700 mt-1">
              Estimated: {plan.estimatedDelivery ?? "A few minutes"}.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <DraftDownloadButton planId={plan.id} />
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--warm-200)] bg-white/60 text-[var(--text-muted)] font-[family-name:var(--font-display)] text-sm font-semibold cursor-not-allowed"
            title="Available when your report is ready"
          >
            <Download className="w-4 h-4" />
            PDF
            <span className="text-[10px] font-normal">(when ready)</span>
          </button>
        </div>
      </div>

      <PlanKPIStrip plan={plan} />
      <PlanCharts />

      {plan.sections.length > 0 && (
        <div className="bg-white border border-[var(--warm-200)] rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">
              Report Preview
            </h2>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-1">
              Section details will be available when generation finishes
            </p>
          </div>
          <div className="px-6">
            {plan.sections.map((section) => (
              <PlanSectionComponent key={section.id} section={section} defaultExpanded={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Draft Download Button ---------- */

function DraftDownloadButton({ planId }: { planId: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/plan/${planId}/draft-pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mosaic-draft-plan-${planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // could add toast
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors disabled:opacity-50"
    >
      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
      {downloading ? "Generating..." : "View Draft"}
    </button>
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
      a.download = `mosaic-progress-report-${plan.id}.pdf`;
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
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:hidden">
          {plan.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "snap-start shrink-0 rounded-full px-3 py-2 font-display text-xs font-semibold",
                activeSectionId === section.id
                  ? "bg-[var(--slate-950)] text-white"
                  : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
              )}
            >
              {section.title}
            </button>
          ))}
        </div>
        {/* Sticky sidebar nav */}
        <div className="w-[220px] shrink-0 sticky top-8 self-start hidden lg:block">
          <p className="font-[family-name:var(--font-body)] font-medium text-[12px] uppercase text-[var(--text-muted)] tracking-wider mb-2">
            Report Sections
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mb-1">
            Generated {new Date(plan.createdAt).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <div className="flex items-center gap-1.5 mb-6">
            <Check className="w-3.5 h-3.5 text-[var(--emerald)]" />
            <span className="font-[family-name:var(--font-body)] text-xs text-[var(--emerald)] font-medium">
              Educational Progress Report
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
            Guided Walkthrough with Charlie
          </Link>
        </div>

        {/* Sections */}
        <div className="flex-1 min-w-0">
          {/* Mobile nav */}
          <div className="lg:hidden mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--emerald)]" />
              <span className="font-[family-name:var(--font-body)] text-xs text-[var(--emerald)] font-medium">
                Educational Progress Report
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
                Guided Walkthrough
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
  const { planStatus, isLoading } = usePlanStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          Progress Report
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <p className="font-body text-sm text-[var(--text-muted)]">Loading your report</p>
          <div className="skeleton h-44 w-full" />
        </div>
      ) : (
        <>
          {planStatus === "none" && <PlanNone />}
          {planStatus === "generating" && <PlanGenerating />}
          {planStatus === "pending_review" && <PlanPendingReview />}
          {planStatus === "delivered" && <PlanDelivered />}
        </>
      )}
    </div>
  );
}
