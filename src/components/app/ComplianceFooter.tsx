"use client";

import { cn } from "@/lib/utils";

interface ComplianceFooterProps {
  className?: string;
}

export function ComplianceFooter({ className }: ComplianceFooterProps) {
  return (
    <footer
      className={cn(
        "mx-auto max-w-[800px] px-6 py-6 text-center font-body text-[11px] leading-relaxed text-[var(--text-muted)]",
        className,
      )}
    >
      This is educational information, not financial advice. Speak with a licensed
      financial advisor before implementing any changes.
    </footer>
  );
}
