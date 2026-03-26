"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, Sparkles, AlertTriangle, Info } from "lucide-react";
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl md:text-[24px] text-[var(--text-primary)]">
              {section.title}
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                section.status === "cim_reviewed"
                  ? "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]"
                  : "bg-[var(--warm-100)] text-[var(--text-muted)]"
              }`}
            >
              {section.status === "cim_reviewed" ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Professionally reviewed
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </>
              )}
            </span>
          </div>
          {section.subtitle && (
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-1">
              {section.subtitle}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ml-4 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-[8000px] opacity-100 pb-8" : "max-h-0 opacity-0"
        }`}
      >
        <div className="w-12 h-px bg-[var(--emerald)] mb-6" />

        {section.cards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {section.cards.map((cardData, i) => (
              <FinancialCard key={i} {...cardData} />
            ))}
          </div>
        )}

        {section.prose && (
          <div className="space-y-4 mb-6">
            {section.prose.split("\n\n").filter(Boolean).map((block, i) => {
              const match = block.match(/^([A-Z][^:]{2,50}):\s*([\s\S]+)/);
              if (match) {
                return (
                  <div key={i}>
                    <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] mb-1">
                      {match[1]}
                    </h4>
                    <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] leading-[1.7]">
                      {match[2]}
                    </p>
                  </div>
                );
              }
              return (
                <p key={i} className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] leading-[1.7]">
                  {block}
                </p>
              );
            })}
          </div>
        )}

        {section.tables && section.tables.map((table, ti) => (
          <div key={ti} className="mb-6">
            <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-3">
              {table.title}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-[var(--warm-200)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--warm-100)]">
                    {table.headers.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[var(--warm-50)]"}>
                      <td className="px-4 py-3 font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)]">
                        {row.label}
                      </td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="px-4 py-3 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] tabular-nums">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {section.id === "debt_elimination_plan" && section.tables && section.tables.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 p-4 rounded-lg bg-indigo-50/60 border border-indigo-100">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-indigo-900 mb-1">
                  Avalanche Method
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-indigo-700 leading-relaxed">
                  Pay off the highest-interest debt first while making minimum payments on the rest. Minimizes total interest paid and is mathematically optimal.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-amber-50/60 border border-amber-100">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-amber-900 mb-1">
                  Snowball Method
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-amber-700 leading-relaxed">
                  Pay off the smallest balance first for quick wins, then roll those payments into the next debt. Builds momentum and is psychologically effective.
                </p>
              </div>
            </div>
          </div>
        )}

        {section.coverageRecs && section.coverageRecs.length > 0 && (
          <div className="mb-6">
            <h4 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Coverage Considerations
            </h4>
            <div className="space-y-3">
              {section.coverageRecs.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)]"
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                    rec.priority === "high" ? "text-red-500" : rec.priority === "medium" ? "text-amber-500" : "text-gray-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
                        {rec.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                        rec.priority === "high" ? "bg-red-50 text-red-600"
                          : rec.priority === "medium" ? "bg-amber-50 text-amber-600"
                          : "bg-gray-50 text-gray-500"
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                      {rec.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
                  <span className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] flex-1">
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
          <div className="mb-6">
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

        {section.disclaimer && (
          <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 mt-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-[family-name:var(--font-body)] text-xs text-amber-800">
              {section.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
