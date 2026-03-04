"use client";

import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { PlanStatus } from "@/types";

interface ApprovalStatusBannerProps {
  status: PlanStatus;
  estimatedDelivery?: string;
  planId?: string;
}

export function ApprovalStatusBanner({ status, estimatedDelivery, planId }: ApprovalStatusBannerProps) {
  if (status === "pending_review") {
    return (
      <div className="w-full rounded-lg p-4 flex items-center gap-3 bg-[var(--warning)]/10 border border-[var(--warning)]/20">
        <Clock className="w-5 h-5 text-[var(--warning)] shrink-0" />
        <div className="flex-1">
          <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
            Your plan is being reviewed by a CIM professional.
          </p>
          {estimatedDelivery && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] mt-0.5">
              Estimated: {estimatedDelivery}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === "delivered") {
    return (
      <div className="w-full rounded-lg p-4 flex items-center gap-3 bg-[var(--emerald)]/10 border border-[var(--emerald)]/20">
        <CheckCircle2 className="w-5 h-5 text-[var(--emerald)] shrink-0" />
        <div className="flex-1">
          <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
            Your plan is ready!
          </p>
        </div>
        {planId && (
          <Link
            href={`/dashboard/plan/${planId}`}
            className="px-4 py-1.5 rounded-lg bg-[var(--emerald)] text-white text-sm font-medium font-[family-name:var(--font-display)] hover:bg-[var(--emerald-dark)] transition-colors"
          >
            View Plan
          </Link>
        )}
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="w-full rounded-lg p-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div className="flex-1">
          <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
            Your plan is being generated. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
