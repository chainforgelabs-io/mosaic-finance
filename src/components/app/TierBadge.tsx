"use client";

import { cn } from "@/lib/utils";

type Tier = "free" | "essential" | "pro" | "premium";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

const tierStyles: Record<Tier, string> = {
  free: "bg-gray-200 text-gray-600",
  essential: "bg-[var(--slate-950)] text-white",
  pro: "border border-[var(--emerald)] text-[var(--emerald)] bg-transparent",
  premium: "bg-[var(--emerald)] text-white",
};

const tierLabels: Record<Tier, string> = {
  free: "Free",
  essential: "Essential",
  pro: "Pro",
  premium: "Premium",
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
