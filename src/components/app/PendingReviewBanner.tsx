"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

type PendingItem = {
  sessionId: string;
  createdAt: string;
  changeSectionCount: number;
};

export function PendingReviewBanner() {
  const [items, setItems] = useState<PendingItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversation/pending-annual-review");
        if (!res.ok) return;
        const data = (await res.json()) as { pending?: PendingItem[] };
        if (!cancelled) setItems(data.pending ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items == null || items.length === 0) return null;

  const top = items[0]!;
  const extra = items.length - 1;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3">
      <ClipboardList className="mt-0.5 size-5 shrink-0 text-amber-800" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[14px] font-semibold text-amber-950">
          Annual review changes need your confirmation
        </p>
        <p className="mt-1 font-body text-[13px] text-amber-900/90">
          Charlie captured updates from your review (
          {top.changeSectionCount} section
          {top.changeSectionCount === 1 ? "" : "s"}). Confirm before they
          are saved and your Progress Report is regenerated.
          {extra > 0
            ? ` You have ${extra} more pending review${extra === 1 ? "" : "s"}.`
            : ""}
        </p>
        <Link
          href={`/dashboard/meeting/${top.sessionId}/apply-changes`}
          className="mt-2 inline-flex font-display text-[13px] font-semibold text-amber-900 underline hover:no-underline"
        >
          Review and apply changes
        </Link>
      </div>
    </div>
  );
}
