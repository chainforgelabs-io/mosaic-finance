"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Check, Plus, Target, Trash2, X } from "lucide-react";
import { UnlockToast, type UnlockItem } from "@/components/tracking/UnlockToast";
import {
  GOAL_PRIORITIES,
  GOAL_TYPE_LABELS,
  GOAL_TYPES,
  type GoalPriority,
  type GoalType,
} from "@/lib/tracking/categories";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { GoalRow } from "@/types/tracking";

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/goals", { credentials: "include" });
    if (res.ok) {
      const json = await res.json();
      setGoals(json.goals ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = goals.filter((g) => g.status === "active");
  const achieved = goals.filter((g) => g.status === "achieved");
  const archived = goals.filter((g) => g.status === "archived");

  async function patch(id: string, updates: Partial<GoalRow>) {
    const res = await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
      await load();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/goals?id=${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Goals</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Track the outcomes continued use of Mosaic should help you hit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-[var(--emerald-dark)]"
        >
          <Plus className="size-4" />
          Add goal
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      ) : active.length === 0 && achieved.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-4 py-12 text-center">
          <Target className="mx-auto mb-3 size-10 text-[var(--text-muted)]" />
          <p className="font-display font-semibold">No goals yet</p>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Add a target for debt, savings, or a purchase so progress is visible every month.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {active.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onEdit={() => {
                    setEditing(g);
                    setShowForm(true);
                  }}
                  onAchieve={() => patch(g.id, { status: "achieved", current_amount: g.target_amount ?? g.current_amount })}
                  onArchive={() => patch(g.id, { status: "archived" })}
                  onDelete={() => remove(g.id)}
                />
              ))}
            </div>
          )}
          {achieved.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold">Achieved</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {achieved.map((g) => (
                  <GoalCard key={g.id} goal={g} onDelete={() => remove(g.id)} />
                ))}
              </div>
            </div>
          )}
          {archived.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold text-[var(--text-muted)]">Archived</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {archived.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onDelete={() => remove(g.id)}
                    onAchieve={() => patch(g.id, { status: "active" })}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <GoalForm
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowForm(false);
            setEditing(null);
            await load();
          }}
        />
      )}

      <UnlockToast unlocks={unlocks} onDismiss={() => setUnlocks([])} />
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onAchieve,
  onArchive,
  onDelete,
}: {
  goal: GoalRow;
  onEdit?: () => void;
  onAchieve?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const target = Number(goal.target_amount) || 0;
  const current = Number(goal.current_amount) || 0;
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining =
    goal.target_date != null
      ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            {GOAL_TYPE_LABELS[goal.goal_type] ?? goal.goal_type}
          </p>
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">{goal.name}</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-display text-[10px] font-semibold uppercase",
            goal.priority === "high" && "bg-red-50 text-red-600",
            goal.priority === "medium" && "bg-amber-50 text-amber-700",
            goal.priority === "low" && "bg-[var(--warm-100)] text-[var(--text-secondary)]",
          )}
        >
          {goal.priority}
        </span>
      </div>
      {target > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between font-body text-xs text-[var(--text-muted)]">
            <span>{formatMoney(current)}</span>
            <span>{formatMoney(target)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--warm-100)]">
            <div
              className="h-full rounded-full bg-[var(--emerald)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      {remaining != null && goal.status === "active" && (
        <p className="mt-2 font-body text-xs text-[var(--text-muted)]">
          {remaining >= 0 ? `${remaining} days remaining` : `${Math.abs(remaining)} days past target`}
        </p>
      )}
      {goal.status === "achieved" && (
        <p className="mt-2 inline-flex items-center gap-1 font-display text-xs font-semibold text-[var(--emerald-dark)]">
          <Check className="size-3.5" /> Achieved
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-[var(--warm-200)] px-2.5 py-1 font-display text-xs font-semibold"
          >
            Edit
          </button>
        )}
        {onAchieve && goal.status === "active" && (
          <button
            type="button"
            onClick={onAchieve}
            className="rounded-md bg-[var(--emerald)] px-2.5 py-1 font-display text-xs font-semibold text-white"
          >
            Mark achieved
          </button>
        )}
        {onAchieve && goal.status === "archived" && (
          <button
            type="button"
            onClick={onAchieve}
            className="rounded-md border border-[var(--warm-200)] px-2.5 py-1 font-display text-xs font-semibold"
          >
            Restore
          </button>
        )}
        {onArchive && (
          <button type="button" onClick={onArchive} className="text-[var(--text-muted)]" aria-label="Archive">
            <Archive className="size-3.5" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className="text-[var(--text-muted)] hover:text-[var(--error)]" aria-label="Delete">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function GoalForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: GoalRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goalType, setGoalType] = useState<GoalType>(initial?.goal_type ?? "savings");
  const [targetAmount, setTargetAmount] = useState(
    initial?.target_amount != null ? String(initial.target_amount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(String(initial?.current_amount ?? 0));
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");
  const [priority, setPriority] = useState<GoalPriority>(initial?.priority ?? "medium");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      goal_type: goalType,
      target_amount: targetAmount ? Number(targetAmount) : null,
      current_amount: Number(currentAmount) || 0,
      target_date: targetDate || null,
      priority,
      source: initial ? undefined : "manual",
    };
    if (initial) {
      await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: initial.id, ...payload }),
      });
    } else {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{initial ? "Edit goal" : "New goal"}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Type</label>
        <select
          value={goalType}
          onChange={(e) => setGoalType(e.target.value as GoalType)}
          className="mb-3 mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        >
          {GOAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {GOAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Target</label>
            <input
              type="number"
              min="0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
            />
          </div>
          <div>
            <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Current</label>
            <input
              type="number"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
            />
          </div>
        </div>
        <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Target date</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <p className="mb-2 font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Priority</p>
        <div className="mb-5 flex gap-2">
          {GOAL_PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "flex-1 rounded-lg py-2 font-display text-xs font-semibold capitalize",
                priority === p ? "bg-[var(--emerald)] text-white" : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save goal"}
        </button>
      </div>
    </div>
  );
}
