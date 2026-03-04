"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <Icon className="w-12 h-12 text-[var(--text-muted)] mb-4" strokeWidth={1.5} />
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-secondary)] max-w-sm">
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex items-center px-6 py-2.5 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-[var(--emerald-dark)] transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
