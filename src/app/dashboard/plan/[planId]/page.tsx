"use client";

import { useEffect, useState, useRef } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { PlanSectionComponent } from "@/components/app/PlanSectionComponent";
import { EmptyState } from "@/components/app/EmptyState";
import { CheckCircle2, Download, FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

function PlanNav({
  sections,
  activeId,
  onSelect,
  createdAt,
  planId,
}: {
  sections: { id: string; title: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  createdAt: string;
  planId: string;
}) {
  return (
    <div className="w-[220px] shrink-0 sticky top-8 self-start hidden lg:block">
      <p className="font-[family-name:var(--font-body)] font-medium text-[12px] uppercase text-[var(--text-muted)] tracking-wider mb-2">
        Progress Report
      </p>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mb-1">
        Generated {new Date(createdAt).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
      </p>
      <div className="flex items-center gap-1.5 mb-6">
        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--emerald)]" />
        <span className="font-[family-name:var(--font-body)] text-xs text-[var(--emerald)] font-medium">
          Educational Progress Report
        </span>
      </div>

      <nav className="space-y-0.5 mb-8">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-[family-name:var(--font-body)] transition-colors relative ${
              activeId === section.id
                ? "text-[var(--text-primary)] font-semibold bg-[var(--warm-100)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--warm-50)]"
            }`}
          >
            {activeId === section.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--emerald)] rounded-r" />
            )}
            {section.title}
          </button>
        ))}
      </nav>

      <button
        onClick={() => {
          window.alert("PDF download would trigger via /api/plan/" + planId + "/pdf");
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </button>
    </div>
  );
}

export default function PlanViewPage() {
  const { planId } = useParams<{ planId: string }>();
  const { plan, loadMockData, user } = usePlanStore();
  const [activeSectionId, setActiveSectionId] = useState("");
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!plan || plan.status !== "delivered") {
      loadMockData("delivered");
    }
  }, [plan, loadMockData]);

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
      { rootMargin: "-20% 0px -60% 0px" }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [plan?.sections]);

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = sectionRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!plan || plan.status !== "delivered") {
    return (
      <EmptyState
        icon={FileText}
        title="No Progress Report available"
        description="Complete your financial profile to generate your Progress Report."
        ctaLabel="Go to Dashboard"
        ctaHref="/dashboard"
      />
    );
  }

  return (
    <div className="flex gap-8">
      <PlanNav
        sections={plan.sections.map((s) => ({ id: s.id, title: s.title }))}
        activeId={activeSectionId}
        onSelect={scrollToSection}
        createdAt={plan.createdAt}
        planId={planId}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile section nav */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[var(--emerald)]" />
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
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {plan.sections.map((section) => (
          <div
            key={section.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(section.id, el);
            }}
            data-section-id={section.id}
          >
            <PlanSectionComponent section={section} />
          </div>
        ))}

        {/* Sticky guided review CTA */}
        <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-6 px-6 py-4 bg-[var(--warm-100)] border-t border-[var(--warm-200)] flex items-center justify-between">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
            Want a guided walkthrough of your Progress Report?
          </p>
          <Link
            href={`/dashboard/plan/${planId}/walkthrough`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Start guided walkthrough with Charlie
          </Link>
        </div>
      </div>
    </div>
  );
}
