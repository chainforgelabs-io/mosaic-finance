"use client";

import { cn } from "@/lib/utils";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type ApprovalStatus = "pending" | "pending_review" | "ready" | "delivered" | "rejected";

interface ApprovalStatusBannerProps {
  status: ApprovalStatus;
  estimatedDelivery?: string;
  planId?: string;
  className?: string;
}

const config: Record<
  ApprovalStatus,
  {
    icon: typeof Clock;
    bgClass: string;
    iconColor: string;
  }
> = {
  pending: {
    icon: Clock,
    bgClass: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-600",
  },
  pending_review: {
    icon: Clock,
    bgClass: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-600",
  },
  ready: {
    icon: CheckCircle,
    bgClass: "bg-[var(--emerald)]/10 border-[var(--emerald)]/20",
    iconColor: "text-[var(--emerald)]",
  },
  delivered: {
    icon: CheckCircle,
    bgClass: "bg-[var(--emerald)]/10 border-[var(--emerald)]/20",
    iconColor: "text-[var(--emerald)]",
  },
  rejected: {
    icon: AlertCircle,
    bgClass: "bg-red-500/10 border-red-500/20",
    iconColor: "text-[var(--error)]",
  },
};

export function ApprovalStatusBanner({
  status,
  estimatedDelivery,
  planId,
  className,
}: ApprovalStatusBannerProps) {
  const { icon: Icon, bgClass, iconColor } = config[status];

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-5 py-4",
        bgClass,
        className,
      )}
    >
      <Icon className={cn("size-5 shrink-0", iconColor)} />
      <div className="flex flex-1 items-center justify-between gap-4">
        <p className="font-body text-sm text-[var(--text-primary)]">
          {(status === "pending" || status === "pending_review") && (
            <>
              Your plan is being reviewed.
              {estimatedDelivery && (
                <span className="text-[var(--text-secondary)]">
                  {" "}
                  Estimated: {estimatedDelivery}
                </span>
              )}
            </>
          )}
          {(status === "ready" || status === "delivered") && "Your plan is ready!"}
          {status === "rejected" && "Additional information needed"}
        </p>
        {(status === "ready" || status === "delivered") && planId && (
          <Link
            href={`/dashboard/plan/${planId}`}
            className="shrink-0 rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
          >
            View Plan
          </Link>
        )}
        {status === "rejected" && (
          <Link
            href="/onboarding/fact-find"
            className="shrink-0 rounded-lg bg-[var(--error)] px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Provide Info
          </Link>
        )}
      </div>
    </div>
  );
}
