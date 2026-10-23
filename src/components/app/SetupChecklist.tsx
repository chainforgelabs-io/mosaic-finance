"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import {
  nextSetupItem,
  setupItemHref,
  SETUP_ITEM_LABEL,
  type SetupItem,
  type SetupStatus,
} from "@/lib/onboarding/setup-status";

const ITEMS: SetupItem[] = ["cash-flow", "net-worth", "goals"];

function itemDone(item: SetupItem, status: SetupStatus): boolean {
  if (item === "cash-flow") return status.planSet;
  if (item === "net-worth") return status.snapshotEver;
  return status.goalsReviewed;
}

export function SetupChecklist({ status }: { status: SetupStatus }) {
  const next = nextSetupItem(status);
  if (!next) return null;

  return (
    <section className="mb-6 rounded-xl border border-[var(--emerald)]/30 bg-white p-4 sm:p-5">
      <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
        Finish setup
      </h2>
      <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
        Charlie already has the picture. Check Cash Flow, Net Worth, and Goals so the numbers stay
        current.
      </p>
      <ol className="mt-3 space-y-2">
        {ITEMS.map((item) => {
          const done = itemDone(item, status);
          const current = item === next;
          return (
            <li key={item}>
              <Link
                href={setupItemHref(item)}
                className={
                  current
                    ? "flex items-center justify-between gap-3 rounded-lg border border-[var(--emerald)] bg-[var(--emerald-soft)] px-3 py-2.5"
                    : "flex items-center justify-between gap-3 rounded-lg border border-[var(--warm-200)] px-3 py-2.5"
                }
              >
                <span className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--text-primary)]">
                  {done ? (
                    <Check className="size-4 text-[var(--emerald)]" aria-hidden />
                  ) : (
                    <Circle className="size-4 text-[var(--text-muted)]" aria-hidden />
                  )}
                  {SETUP_ITEM_LABEL[item]}
                </span>
                {!done && (
                  <span className="font-display text-xs font-semibold text-[var(--emerald-dark)]">
                    {current ? "Start here" : "Open"}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
