"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import { resolveEntitlements } from "@/lib/entitlements";

export default function AcademyPage() {
  const user = usePlanStore((s) => s.user);
  const entitlements = resolveEntitlements({
    subscription_tier: user?.tier,
    trial_ends_at: user?.trialEndsAt,
    academy_access: user?.academyAccess,
    subscription_interval: user?.subscriptionInterval,
  });

  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white p-8">
      <GraduationCap className="size-8 text-[var(--emerald)]" />
      <h1 className="mt-4 font-display text-2xl font-bold text-[var(--text-primary)]">
        Mosaic Academy
      </h1>
      {entitlements.hasAcademy ? (
        <p className="mt-2 max-w-xl font-body text-sm text-[var(--text-secondary)]">
          Your classroom is included. Lessons are still being added here. Until then,
          the course lives in the Money Club.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-xl font-body text-sm text-[var(--text-secondary)]">
            Mosaic Academy is Canadian money education: the frameworks behind tracking,
            budgets, and the Progress Report. It is included on Mastery annual, or
            available on its own.
          </p>
          <p className="mt-3 max-w-xl font-body text-sm text-[var(--text-muted)]">
            The classroom is coming soon. This page is where it will open.
          </p>
          <Link
            href="/dashboard/settings?tab=subscription"
            className="mt-6 inline-flex rounded-full bg-[var(--emerald)] px-5 py-2.5 font-display text-sm font-semibold text-white"
          >
            See Academy pricing
          </Link>
        </>
      )}
    </div>
  );
}
