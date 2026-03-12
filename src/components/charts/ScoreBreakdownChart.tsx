"use client";

import { usePlanStore } from "@/stores/plan-store";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const DIMENSION_LABELS: Record<string, string> = {
  cash_flow: "Cash Flow",
  debt: "Debt",
  savings: "Savings",
  protection: "Protection",
  planning: "Planning",
};

export function ScoreBreakdownChart() {
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const diag = rawPlanData?.financial_health_diagnostic as Record<string, unknown> | undefined;
  const breakdown = diag?.score_breakdown as Record<string, number> | undefined;

  if (!breakdown) return null;

  const data = Object.entries(breakdown).map(([key, value]) => ({
    dimension: DIMENSION_LABELS[key] ?? key,
    score: value,
    fullMark: 100,
  }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        Health Score Breakdown
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-2">
        Performance across five financial dimensions
      </p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="var(--warm-200)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              axisLine={false}
            />
            <Radar
              dataKey="score"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
