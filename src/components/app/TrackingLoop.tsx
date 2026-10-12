"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Landmark, Loader2, Wallet } from "lucide-react";
import { HealthScore } from "@/components/app/HealthScore";
import { outflowTotal, type CashTxn } from "@/lib/tracking/cash-capture";
import { startOfWeekMonday, todayIso, weekRange } from "@/lib/tracking/dates";
import { formatMoneyExact } from "@/lib/tracking/format";
import type { GamificationSummary } from "@/types/tracking";

interface TrackingLoopProps {
  reportAvailable: boolean;
}

interface ReportEntry {
  path: string;
  started: boolean;
}

export function TrackingLoop({ reportAvailable }: TrackingLoopProps) {
  const [score, setScore] = useState<number | null>(null);
  const [delta90, setDelta90] = useState<number | null>(null);
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [weekSpend, setWeekSpend] = useState<number | null>(null);
  const [entry, setEntry] = useState<ReportEntry>({ path: "/onboarding", started: false });

  useEffect(() => {
    let cancelled = false;

    const today = todayIso();
    const range = weekRange(startOfWeekMonday(today));

    void fetch("/api/health-score", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || data?.score == null) return;
        setScore(Number(data.score));
        setDelta90(data.delta90 ?? null);
      })
      .catch(() => undefined);

    void fetch("/api/gamification/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSummary(data as GamificationSummary);
      })
      .catch(() => undefined);

    void fetch(`/api/transactions?start=${range.start}&end=${range.end}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setWeekSpend(outflowTotal((data.transactions ?? []) as CashTxn[]));
      })
      .catch(() => undefined);

    void fetch("/api/auth/redirect", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.reportEntryPath) return;
        setEntry({
          path: String(data.reportEntryPath),
          started: Boolean(data.reportStarted),
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const loggedThisWeek = summary?.loggedThisWeek ?? false;
  const snapshotted = summary?.snapshottedThisMonth ?? false;
  const primary = !summary || !loggedThisWeek
    ? { href: "/dashboard/cash-flow", label: "Log this week" }
    : !snapshotted
      ? { href: "/dashboard/assets", label: "Update net worth" }
      : { href: "/dashboard/cash-flow", label: "Add another spend" };

  const monthLabel = new Date().toLocaleDateString("en-CA", { month: "long" });
  const streak = summary?.weeklyStreak ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5 sm:p-8">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.1em] text-[var(--emerald)]">
          This week
        </p>
        <h2 className="mt-2 max-w-xl font-display text-2xl font-bold leading-tight text-[var(--text-primary)]">
          Log spending each week. Your Health Score shows the picture.
        </h2>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          A monthly net worth snapshot keeps it current. This is tracking, not advice.
        </p>

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
          <div className="flex shrink-0 flex-col items-center justify-center">
            {score != null ? (
              <HealthScore score={score} size="md" />
            ) : (
              <div className="flex size-[120px] items-center justify-center rounded-full border-2 border-dashed border-[var(--warm-200)]">
                <Loader2 className="size-5 animate-spin text-[var(--emerald)]" />
              </div>
            )}
            <p className="mt-2 font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Health Score
            </p>
            {delta90 != null && (
              <p className="font-body text-xs text-[var(--text-secondary)]">
                90-day {delta90 >= 0 ? "+" : ""}
                {delta90}
              </p>
            )}
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <LoopStat
              href="/dashboard/cash-flow"
              icon={Wallet}
              label="Spent this week"
              value={weekSpend == null ? "--" : formatMoneyExact(weekSpend)}
              detail={loggedThisWeek ? "Logged" : "Nothing logged yet"}
              active={loggedThisWeek}
            />
            <LoopStat
              href="/dashboard/cash-flow"
              icon={Flame}
              label="Weekly log"
              value={summary == null ? "--" : streak === 1 ? "1 week" : `${streak} weeks`}
              detail={loggedThisWeek ? "Done this week" : "Not yet this week"}
              active={loggedThisWeek}
            />
            <LoopStat
              href="/dashboard/assets"
              icon={Landmark}
              label="Net worth snapshot"
              value={summary == null ? "--" : snapshotted ? "Saved" : "Due"}
              detail={snapshotted ? `Saved for ${monthLabel}` : `Due in ${monthLabel}`}
              active={snapshotted}
            />
          </div>
        </div>

        <Link
          href={primary.href}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-5 py-3 font-display text-sm font-semibold text-white transition-colors hover:bg-[#059669] sm:w-auto"
        >
          {primary.label}
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--warm-200)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Progress Report
          </h2>
          <p className="mt-1 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            {reportAvailable
              ? entry.started
                ? "Pick up the conversation where you left off. Charlie explains the picture — educational information, not advice."
                : "Charlie, your AI money guide, can build a Progress Report from a short conversation — about 5 minutes for the key numbers. Educational information, not advice."
              : "Progress Reports are included on Progress. Your Health Score and weekly logging stay free on Pulse."}
          </p>
        </div>
        <Link
          href={reportAvailable ? entry.path : "/dashboard/settings?tab=subscription"}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--warm-200)] px-5 py-2.5 font-display text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]"
        >
          {reportAvailable
            ? entry.started
              ? "Continue your Progress Report"
              : "Build your Progress Report"
            : "See Progress"}
          <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}

function LoopStat({
  href,
  icon: Icon,
  label,
  value,
  detail,
  active,
}: {
  href: string;
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-[var(--warm-50)] px-4 py-3 transition-colors hover:bg-[var(--warm-100)]"
    >
      <div className="flex items-center gap-1.5">
        <Icon className={active ? "size-3.5 text-[var(--emerald)]" : "size-3.5 text-[var(--text-muted)]"} />
        <p className="font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      <p className="font-body text-[11px] text-[var(--text-muted)]">{detail}</p>
    </Link>
  );
}
