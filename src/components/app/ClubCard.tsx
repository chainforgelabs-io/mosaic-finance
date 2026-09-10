"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import { resolveEntitlements } from "@/lib/entitlements";

export function ClubCard() {
  const user = usePlanStore((s) => s.user);
  const entitlements = resolveEntitlements({
    subscription_tier: user?.tier,
    trial_ends_at: user?.trialEndsAt,
    academy_access: user?.academyAccess,
    subscription_interval: user?.subscriptionInterval,
  });
  const url = process.env.NEXT_PUBLIC_SKOOL_GROUP_URL;

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-[var(--emerald)]" />
        <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
          Mosaic Money Club
        </h3>
      </div>
      {entitlements.hasClub ? (
        <>
          <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
            Weekly net-worth check-ins, streak challenges, and the 90-Day Canadian
            Money Reset live here.
          </p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full bg-[var(--emerald)] px-4 py-2 font-display text-sm font-semibold text-white"
            >
              Open the Club
            </a>
          ) : (
            <p className="mt-3 font-body text-xs text-[var(--text-muted)]">
              Club invite arrives after Mastery is active.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
            The Club is included with Mastery — accountability with people already
            tracking in Mosaic.
          </p>
          <Link
            href="/dashboard/settings?tab=subscription"
            className="mt-4 inline-flex rounded-full border border-[var(--slate-950)] px-4 py-2 font-display text-sm font-semibold text-[var(--slate-950)]"
          >
            Unlock with Mastery
          </Link>
        </>
      )}
    </div>
  );
}
