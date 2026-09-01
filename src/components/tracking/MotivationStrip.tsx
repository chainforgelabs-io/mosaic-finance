"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Flame, Landmark, Target } from "lucide-react";
import type { GamificationSummary } from "@/types/tracking";
import { cn } from "@/lib/utils";

export function MotivationStrip({ className }: { className?: string }) {
  const [data, setData] = useState<GamificationSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gamification/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json as GamificationSummary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const nudge = !data.loggedThisWeek
    ? { href: "/dashboard/cash-flow", label: "Log this week’s spending" }
    : !data.snapshottedThisMonth
      ? { href: "/dashboard/assets", label: "Update net worth this month" }
      : null;

  const recent = data.achievements.slice(0, 3);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--warm-200)] bg-white p-4 sm:p-5",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StreakCell
          icon={Flame}
          label="Weekly log"
          value={`${data.weeklyStreak} wk`}
          active={data.loggedThisWeek}
        />
        <StreakCell
          icon={Landmark}
          label="Monthly check-in"
          value={`${data.monthlyStreak} mo`}
          active={data.snapshottedThisMonth}
        />
        <div className="col-span-2 flex min-w-0 flex-col justify-center rounded-lg bg-[var(--warm-50)] px-3 py-2 sm:col-span-2">
          <p className="font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Recent badges
          </p>
          {recent.length === 0 ? (
            <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
              Log spending or save a snapshot to earn your first badge.
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recent.map((a) => (
                <span
                  key={a.key}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--emerald-soft)] px-2 py-0.5 font-display text-[11px] font-medium text-[var(--emerald-dark)]"
                >
                  <Award className="size-3" />
                  {a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {nudge && (
        <Link
          href={nudge.href}
          className="mt-3 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-[var(--emerald)] hover:text-[var(--emerald-dark)]"
        >
          <Target className="size-4" />
          {nudge.label}
        </Link>
      )}
    </div>
  );
}

function StreakCell({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--warm-50)] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", active ? "text-[var(--emerald)]" : "text-[var(--text-muted)]")} />
        <p className="font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-1 font-display text-lg font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      <p className="font-body text-[11px] text-[var(--text-muted)]">
        {active ? "Done" : "Due"}
      </p>
    </div>
  );
}
