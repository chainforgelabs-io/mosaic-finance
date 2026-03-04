"use client";

import type { Tier } from "@/types";

const tierStyles: Record<Tier, string> = {
  free: "bg-gray-200 text-gray-600",
  essential: "bg-[var(--slate-950)] text-white",
  pro: "border border-[var(--emerald)] text-[var(--emerald)]",
  premium: "bg-[var(--emerald)] text-white",
};

const tierLabels: Record<Tier, string> = {
  free: "Free",
  essential: "Essential",
  pro: "Pro",
  premium: "Premium",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium font-[family-name:var(--font-display)] tracking-wide ${tierStyles[tier]}`}
    >
      {tierLabels[tier]}
    </span>
  );
}
