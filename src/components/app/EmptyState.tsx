"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 text-center",
        className,
      )}
    >
      <Icon className="mb-4 size-12 text-[var(--text-muted)]" strokeWidth={1.5} />
      <h3 className="mb-2 font-display text-xl font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mb-6 max-w-sm font-body text-[15px] text-[var(--text-secondary)]">
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center rounded-lg bg-[var(--emerald)] px-5 py-2.5 font-display text-sm font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
