"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, Sparkles } from "lucide-react";
import type { PlanSection } from "@/types";
import { FinancialCard } from "./FinancialCard";

interface PlanSectionComponentProps {
  section: PlanSection;
  defaultExpanded?: boolean;
}

export function PlanSectionComponent({ section, defaultExpanded = true }: PlanSectionComponentProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-[var(--warm-200)] last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-[28px] text-[var(--text-primary)]">
            {section.title}
          </h2>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              section.status === "cim_reviewed"
                ? "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]"
                : "bg-[var(--warm-100)] text-[var(--text-muted)]"
            }`}
          >
            {section.status === "cim_reviewed" ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                CIM Reviewed
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                AI Generated
              </>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-[4000px] opacity-100 pb-8" : "max-h-0 opacity-0"
        }`}
      >
        <div className="w-12 h-px bg-[var(--emerald)] mb-6" />

        {section.cards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {section.cards.map((card, i) => (
              <FinancialCard key={i} {...card} />
            ))}
          </div>
        )}

        {section.prose && (
          <div className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] leading-[1.7] mb-6 whitespace-pre-line">
            {section.prose}
          </div>
        )}

        {section.actionItems.length > 0 && (
          <div className="mb-6">
            <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Action Items
            </h4>
            <ul className="space-y-2">
              {section.actionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className="text-[var(--emerald)] font-semibold mt-0.5">→</span>
                  <span className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)]">
                    {item.text}
                  </span>
                  <span
                    className={`ml-auto shrink-0 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                      item.priority === "high"
                        ? "bg-red-50 text-red-600"
                        : item.priority === "medium"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {item.priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {section.etfTable && section.etfTable.length > 0 && (
          <div>
            <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-3">
              ETF Considerations
            </h4>
            <div className="overflow-x-auto rounded-lg border border-[var(--warm-200)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--warm-100)]">
                    <th className="px-4 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-4 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      MER
                    </th>
                    <th className="px-4 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Allocation
                    </th>
                    <th className="px-4 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Rationale
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.etfTable.map((etf, i) => (
                    <tr
                      key={etf.ticker}
                      className={i % 2 === 0 ? "bg-white" : "bg-[var(--warm-50)]"}
                    >
                      <td className="px-4 py-3 font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--emerald)] tabular-nums">
                        {etf.ticker}
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                        {etf.name}
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] tabular-nums">
                        {etf.mer}
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {etf.allocation}
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]">
                        {etf.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
