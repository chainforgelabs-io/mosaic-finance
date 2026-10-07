"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import { resolveEntitlements } from "@/lib/entitlements";

export default function PriorityPage() {
  const user = usePlanStore((s) => s.user);
  const entitlements = resolveEntitlements({
    subscription_tier: user?.tier,
    trial_ends_at: user?.trialEndsAt,
  });
  const mastery = entitlements.effectiveTier === "mastery";

  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white p-8">
      <Zap className="size-8 text-[var(--emerald)]" />
      <h1 className="mt-4 font-display text-2xl font-bold text-[var(--text-primary)]">
        Priority generation
      </h1>
      {mastery ? (
        <p className="mt-2 max-w-xl font-body text-sm text-[var(--text-secondary)]">
          Your Progress Report is already in the priority queue. First reports still
          appear as soon as they are ready. Monthly refreshes use the same priority.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-xl font-body text-sm text-[var(--text-secondary)]">
            Priority generation is a Mastery perk. It moves your Progress Report ahead
            in the queue. It is not a separate product, and it does not change what
            the report says.
          </p>
          <Link
            href="/dashboard/settings?tab=subscription"
            className="mt-6 inline-flex rounded-full bg-[var(--emerald)] px-5 py-2.5 font-display text-sm font-semibold text-white"
          >
            Upgrade to Mastery
          </Link>
        </>
      )}
    </div>
  );
}
