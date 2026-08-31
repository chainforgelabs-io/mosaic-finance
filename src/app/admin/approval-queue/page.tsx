"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { TierBadge } from "@/components/app/TierBadge";
import { EmptyState } from "@/components/app/EmptyState";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { QueueFilter, ApprovalQueueItem } from "@/types";

function useCountdown(deadline: string) {
  const [remaining, setRemaining] = useState(() => calcRemaining(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(deadline));
    }, 60_000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}

function calcRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, overdue: true, total: diff };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, overdue: false, total: diff };
}

function getSlaColor(total: number, overdue: boolean): string {
  if (overdue) return "text-[var(--error)]";
  const hours = total / (1000 * 60 * 60);
  if (hours < 4) return "text-[var(--error)]";
  if (hours < 12) return "text-[var(--warning)]";
  return "text-[var(--emerald)]";
}

function SlaTimer({ deadline }: { deadline: string }) {
  const { hours, minutes, overdue, total } = useCountdown(deadline);
  const color = getSlaColor(total, overdue);

  return (
    <span className={`font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums ${color}`}>
      {overdue ? (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Overdue
        </span>
      ) : (
        `${hours}h ${minutes}m`
      )}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: "priority" | "standard" }) {
  if (priority === "priority") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--emerald-soft)] text-[var(--emerald-dark)] text-[11px] font-semibold font-[family-name:var(--font-display)] tracking-wide">
        <Zap className="w-3 h-3" />
        Priority
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--warm-100)] text-[var(--text-muted)] text-[11px] font-medium font-[family-name:var(--font-display)] tracking-wide">
      Standard
    </span>
  );
}

const FILTER_TABS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "priority", label: "Priority" },
  { key: "standard", label: "Standard" },
  { key: "overdue", label: "Overdue" },
];

function QueueRow({ item }: { item: ApprovalQueueItem }) {
  const isOverdue = new Date(item.slaDeadline) < new Date();

  return (
    <tr
      className={`border-b border-[var(--warm-200)] last:border-b-0 transition-colors hover:bg-[var(--warm-50)] ${
        isOverdue ? "bg-red-50/60" : ""
      } ${item.priority === "priority" && !isOverdue ? "border-l-[3px] border-l-[var(--emerald)]" : ""} ${
        isOverdue ? "border-l-[3px] border-l-[var(--error)]" : ""
      }`}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--slate-950)] flex items-center justify-center shrink-0">
            <span className="font-[family-name:var(--font-display)] text-white text-xs font-semibold">
              {item.userAlias.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
              {item.userAlias}
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
              {item.province} · Age {item.age}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {item.riskScore}
          </span>
          <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
            {item.riskLabel}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <TierBadge tier={item.tier} />
      </td>
      <td className="px-5 py-4">
        <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
          {formatRelativeTime(item.submittedAt)}
        </span>
      </td>
      <td className="px-5 py-4">
        <SlaTimer deadline={item.slaDeadline} />
      </td>
      <td className="px-5 py-4">
        <PriorityBadge priority={item.priority} />
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          href={`/admin/approval-queue/${item.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--slate-950)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--slate-950)]/90 transition-colors"
        >
          Review
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}

export default function ApprovalQueuePage() {
  const { filter, setFilter, getFilteredItems, getQueueStats, queueItems } =
    useAdminStore();

  const items = getFilteredItems();
  const stats = getQueueStats();

  if (!queueItems.length) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <EmptyState
          icon={Inbox}
          title="All reports reviewed"
          description="Nothing in the queue. Great work!"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-8">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-4 h-4 text-[var(--text-muted)]" />}
        />
        <div className="h-8 w-px bg-[var(--warm-200)]" />
        <StatCard
          label="Due Today"
          value={stats.dueToday}
          icon={<AlertTriangle className="w-4 h-4 text-[var(--warning)]" />}
          accent={stats.dueToday > 0 ? (stats.overdue > 0 ? "error" : "warning") : undefined}
        />
        <div className="h-8 w-px bg-[var(--warm-200)]" />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="w-4 h-4 text-[var(--error)]" />}
          accent={stats.overdue > 0 ? "error" : undefined}
        />
        <div className="h-8 w-px bg-[var(--warm-200)]" />
        <StatCard
          label="Completed Today"
          value={stats.completedToday}
          icon={<CheckCircle2 className="w-4 h-4 text-[var(--emerald)]" />}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--warm-200)]">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-medium transition-colors relative ${
              filter === tab.key
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
            {tab.key === "overdue" && stats.overdue > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--error)] text-white text-[10px] font-bold">
                {stats.overdue}
              </span>
            )}
            {filter === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--emerald)]" />
            )}
          </button>
        ))}
      </div>

      {/* Queue table */}
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            No reports match this filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--warm-200)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--warm-100)] border-b border-[var(--warm-200)]">
                <th className="px-5 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-5 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-5 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-5 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-5 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  SLA Deadline
                </th>
                <th className="px-5 py-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <QueueRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "warning" | "error";
}) {
  const valueColor =
    accent === "error"
      ? "text-[var(--error)]"
      : accent === "warning"
      ? "text-[var(--warning)]"
      : "text-[var(--text-primary)]";

  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className={`font-[family-name:var(--font-body)] text-xl font-semibold tabular-nums ${valueColor}`}>
          {value}
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
          {label}
        </p>
      </div>
    </div>
  );
}
