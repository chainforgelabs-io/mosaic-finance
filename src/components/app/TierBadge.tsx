"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/types";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

const tierStyles: Record<Tier, string> = {
  snapshot: "bg-gray-200 text-gray-600",
  plan: "bg-[var(--slate-950)] text-white",
  advisor: "bg-[var(--emerald)] text-white",
};

const tierLabels: Record<Tier, string> = {
  snapshot: "Snapshot",
  plan: "Progress",
  advisor: "Complete",
};

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-display text-[11px] font-600 leading-none",
        tierStyles[tier],
        className,
      )}
    >
      {tierLabels[tier]}
    </span>
  );
}
