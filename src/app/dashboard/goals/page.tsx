"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Archive, Check, Plus, Target, Trash2, X } from "lucide-react";
import { UnlockToast, type UnlockItem } from "@/components/tracking/UnlockToast";
import {
  GOAL_PRIORITIES,
  GOAL_TYPE_LABELS,
  GOAL_TYPES,
  labelFor,
  presentGoalName,
  type GoalPriority,
  type GoalType,
} from "@/lib/tracking/categories";
import { isSavings } from "@/lib/tracking/cash-capture";
import { startOfMonth, todayIso } from "@/lib/tracking/dates";
import { goalDraftToPayload, horizonFromStored, type GoalHorizon } from "@/lib/tracking/goal-draft";
import {
  GOAL_CLASS_LABELS,
  GOAL_CLASSES,
  accountsFromBreakdown,
  goalClassOf,
  inferGoalClass,
  measureGoal,
  type GoalAccount,
  type GoalClass,
  type GoalMeasure,
} from "@/lib/tracking/goal-class";
import { fetchCatalog, fetchPlan } from "@/lib/tracking/plan-client";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { GoalRow, SnapshotBreakdown } from "@/types/tracking";

const CLASS_ORDER: GoalClass[] = ["retirement_age", "retirement_income", "debt", "balance", "note"];

function subscribeMinute(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function snapshotNow() {
  return Date.now();
}

interface GoalPageData {
  goals: GoalRow[] | null;
  latestAccounts: GoalAccount[];
  previousAccounts: GoalAccount[];
  loggedByCategory: Record<string, number>;
  planChoices: { slug: string; label: string }[];
}

async function fetchGoalPageData(): Promise<GoalPageData> {
  const month = startOfMonth(todayIso());
  const year = Number(todayIso().slice(0, 4));
  const [res, snapRes, txnRes, plan, catalog] = await Promise.all([
    fetch("/api/goals", { credentials: "include" }),
    fetch("/api/net-worth/snapshots", { credentials: "include" }),
    fetch(`/api/transactions?start=${month}&end=${todayIso()}`, { credentials: "include" }),
    fetchPlan(year).catch(() => null),
    fetchCatalog().catch(() => []),
  ]);
  let goals: GoalRow[] | null = null;
  if (res.ok) {
    const json = await res.json();
    goals = json.goals ?? [];
  }
  let latestAccounts: GoalAccount[] = [];
  let previousAccounts: GoalAccount[] = [];
  if (snapRes.ok) {
    const json = await snapRes.json();
    const snaps = (json.snapshots ?? []) as { breakdown?: SnapshotBreakdown }[];
    const last = snaps[snaps.length - 1];
    const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;
    latestAccounts = accountsFromBreakdown(last?.breakdown);
    previousAccounts = accountsFromBreakdown(prev?.breakdown);
  }
  const loggedByCategory: Record<string, number> = {};
  if (txnRes.ok) {
    const json = await txnRes.json();
    for (const txn of json.transactions ?? []) {
      if (!isSavings(txn) || !txn.category) continue;
      loggedByCategory[txn.category] = (loggedByCategory[txn.category] ?? 0) + (Number(txn.amount) || 0);
    }
  }
  const slugs = new Set<string>((plan?.entries ?? []).map((entry) => entry.category));
  slugs.add("debt_principal");
  return {
    goals,
    latestAccounts,
    previousAccounts,
    loggedByCategory,
    planChoices: [...slugs].map((slug) => ({ slug, label: labelFor(catalog, slug) })),
  };
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);
  const [latestAccounts, setLatestAccounts] = useState<GoalAccount[]>([]);
  const [previousAccounts, setPreviousAccounts] = useState<GoalAccount[]>([]);
  const [loggedByCategory, setLoggedByCategory] = useState<Record<string, number>>({});
  const [planChoices, setPlanChoices] = useState<{ slug: string; label: string }[]>([]);

  const applyPage = useCallback((data: GoalPageData) => {
    if (data.goals) setGoals(data.goals);
    setLatestAccounts(data.latestAccounts);
    setPreviousAccounts(data.previousAccounts);
    setLoggedByCategory(data.loggedByCategory);
    setPlanChoices(data.planChoices);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    applyPage(await fetchGoalPageData());
  }, [applyPage]);

  useEffect(() => {
    let cancelled = false;
    void fetchGoalPageData().then((data) => {
      if (!cancelled) applyPage(data);
    });
    return () => {
      cancelled = true;
    };
  }, [applyPage]);

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
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 data-tour="page-goals" className="font-display text-2xl font-bold text-[var(--text-primary)]">Goals</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
            Each goal is measured in its own way, from the accounts and plan lines you attach.
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

      {!loading &&
        goals.some((g) => g.source === "fact_find" && !g.reviewed_at) && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--emerald)]/30 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-body text-sm text-[var(--text-secondary)]">
              These goals came from your conversation with Charlie. Check the amounts and dates, then
              confirm.
            </p>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/goals", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ reviewAll: true }),
                });
                await load();
              }}
              className="cursor-pointer rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-sm font-semibold text-white"
            >
              Looks right
            </button>
          </div>
        )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      ) : active.length === 0 && achieved.length === 0 ? (
        <div className="w-full rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-6 py-16 text-center">
          <Target className="mx-auto mb-3 size-10 text-[var(--text-muted)]" />
          <p className="font-display font-semibold">No goals yet</p>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Add a target for debt, savings, or a purchase so progress is visible every month.
          </p>
        </div>
      ) : (
        <>
          {CLASS_ORDER.map((goalClass) => {
            const rows = active.filter((goal) => goalClassOf(goal) === goalClass);
            if (rows.length === 0) return null;
            return (
              <section key={goalClass} className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  {GOAL_CLASS_LABELS[goalClass]}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {rows.map((g) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      measure={measureGoal(
                        g,
                        latestAccounts,
                        previousAccounts,
                        (g.linked_plan_categories ?? []).reduce((sum, slug) => sum + (loggedByCategory[slug] ?? 0), 0),
                      )}
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
              </section>
            );
          })}
          {achieved.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold">Achieved</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {achieved.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    measure={measureGoal(
                      g,
                      latestAccounts,
                      previousAccounts,
                      (g.linked_plan_categories ?? []).reduce((sum, slug) => sum + (loggedByCategory[slug] ?? 0), 0),
                    )}
                    onDelete={() => remove(g.id)}
                  />
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
                    measure={measureGoal(
                      g,
                      latestAccounts,
                      previousAccounts,
                      (g.linked_plan_categories ?? []).reduce((sum, slug) => sum + (loggedByCategory[slug] ?? 0), 0),
                    )}
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
          accounts={latestAccounts}
          planChoices={planChoices}
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

function measureLine(goal: GoalRow, measure: GoalMeasure): string {
  if (measure.goalClass === "debt") {
    if (measure.paidDown == null) return "No debt attached";
    return `${formatMoney(measure.paidDown)} paid down · ${formatMoney(measure.remaining ?? 0)} still owed`;
  }
  if (measure.goalClass === "retirement_age") {
    return goal.target_age != null ? `Target age ${goal.target_age}` : "Retirement age";
  }
  if (measure.goalClass === "retirement_income") {
    return goal.target_amount != null ? `${formatMoney(goal.target_amount)} a year on file` : "Retirement income on file";
  }
  if (measure.goalClass === "note") {
    return goal.amount_unknown || goal.target_amount == null ? "Amount not set" : formatMoney(goal.target_amount);
  }
  if (measure.target != null && measure.current != null) return `${formatMoney(measure.current)} of ${formatMoney(measure.target)}`;
  return measure.current != null ? formatMoney(measure.current) : "";
}

function GoalCard({
  goal,
  measure,
  onEdit,
  onAchieve,
  onArchive,
  onDelete,
}: {
  goal: GoalRow;
  measure: GoalMeasure;
  onEdit?: () => void;
  onAchieve?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const now = useSyncExternalStore(subscribeMinute, snapshotNow, () => 0);
  const remaining =
    goal.target_date != null && now > 0
      ? Math.ceil((new Date(goal.target_date).getTime() - now) / (1000 * 60 * 60 * 24))
      : null;

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            {GOAL_CLASS_LABELS[measure.goalClass]}
          </p>
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">{presentGoalName(goal.name)}</h3>
          {(goal.source === "fact_find" || goal.source === "onboarding") && (
            <p className="mt-1 font-body text-xs text-[var(--text-muted)]">
              From your onboarding session — change this if it isn&apos;t quite right.
            </p>
          )}
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
      {goal.amount_unknown && (
        <p className="mt-3 font-body text-xs text-[var(--text-secondary)]">
          Not sure of the amount — looking to find out what this will cost
        </p>
      )}
      <p className="mt-3 font-display text-sm font-semibold text-[var(--text-primary)]">{measureLine(goal, measure)}</p>
      {measure.goalClass === "retirement_age" && measure.current != null && (
        <p className="mt-1 font-body text-xs text-[var(--text-secondary)]">
          {formatMoney(measure.current)} in the accounts you attached
        </p>
      )}
      {measure.goalClass === "retirement_income" && measure.current != null && (
        <p className="mt-1 font-body text-xs text-[var(--text-secondary)]">
          {formatMoney(measure.current)} in the accounts you attached
        </p>
      )}
      <p className="mt-1 font-body text-xs text-[var(--text-muted)]">{measure.secondary}</p>
      {measure.loggedThisMonth > 0 && (
        <p className="mt-1 font-body text-xs text-[var(--text-secondary)]">
          {formatMoney(measure.loggedThisMonth)} logged this month
        </p>
      )}
      {measure.bar != null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--warm-100)]">
          <div className="h-full rounded-full bg-[var(--emerald)]" style={{ width: `${measure.bar}%` }} />
        </div>
      )}
      {goal.target_age != null && goal.status === "active" && measure.goalClass !== "retirement_age" && (
        <p className="mt-2 font-body text-xs text-[var(--text-muted)]">Target age {goal.target_age}</p>
      )}
      {remaining != null && goal.target_age == null && goal.status === "active" && (
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
          <button
            type="button"
            onClick={onArchive}
            className="inline-flex size-9 items-center justify-center rounded-md text-[var(--text-secondary)]"
            aria-label="Archive"
          >
            <Archive className="size-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex size-9 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--error)]"
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function GoalForm({
  initial,
  accounts,
  planChoices,
  onClose,
  onSaved,
}: {
  initial: GoalRow | null;
  accounts: GoalAccount[];
  planChoices: { slug: string; label: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goalType, setGoalType] = useState<GoalType>(initial?.goal_type ?? "savings");
  const [trackingClass, setTrackingClass] = useState<GoalClass>(
    initial?.tracking_class && (GOAL_CLASSES as readonly string[]).includes(initial.tracking_class)
      ? (initial.tracking_class as GoalClass)
      : inferGoalClass({
          name: initial?.name ?? "",
          goalType: initial?.goal_type ?? "savings",
          targetAmount: initial?.target_amount,
          amountUnknown: initial?.amount_unknown,
          targetAge: initial?.target_age,
        }),
  );
  const [classTouched, setClassTouched] = useState(Boolean(initial?.tracking_class));
  const [linkedAccounts, setLinkedAccounts] = useState<string[]>(initial?.linked_account_ids ?? []);
  const [linkedPlans, setLinkedPlans] = useState<string[]>(initial?.linked_plan_categories ?? []);
  const [targetAmount, setTargetAmount] = useState(
    initial?.target_amount != null ? String(initial.target_amount) : "",
  );
  const [amountUnknown, setAmountUnknown] = useState(Boolean(initial?.amount_unknown));
  const [currentAmount, setCurrentAmount] = useState(String(initial?.current_amount ?? 0));
  const [horizon, setHorizon] = useState<GoalHorizon>(
    initial ? horizonFromStored(initial) : "date",
  );
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");
  const [targetAge, setTargetAge] = useState(
    initial?.target_age != null ? String(initial.target_age) : "",
  );
  const [priority, setPriority] = useState<GoalPriority>(initial?.priority ?? "medium");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      ...goalDraftToPayload({
        name,
        goal_type: goalType,
        target_amount: targetAmount,
        amount_unknown: amountUnknown,
        horizon,
        target_date: targetDate,
        target_age: targetAge,
        priority,
      }),
      current_amount: Number(currentAmount) || 0,
      tracking_class: trackingClass,
      linked_account_ids: linkedAccounts,
      linked_plan_categories: linkedPlans,
      source: initial ? undefined : ("manual" as const),
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
    <div className="phone-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{initial ? "Edit goal" : "New goal"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="phone-hit">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Name</label>
        <input
          value={name}
          onChange={(e) => {
            const next = e.target.value;
            setName(next);
            if (!classTouched) {
              setTrackingClass(
                inferGoalClass({
                  name: next,
                  goalType,
                  targetAmount: Number(targetAmount) || null,
                  amountUnknown,
                  targetAge: Number(targetAge) || null,
                }),
              );
            }
          }}
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
        <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">How this is measured</label>
        <select
          value={trackingClass}
          onChange={(e) => {
            setClassTouched(true);
            setTrackingClass(e.target.value as GoalClass);
          }}
          className="mb-3 mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        >
          {GOAL_CLASSES.map((goalClass) => (
            <option key={goalClass} value={goalClass}>
              {GOAL_CLASS_LABELS[goalClass]}
            </option>
          ))}
        </select>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Target</label>
            <input
              type="number"
              min="0"
              value={amountUnknown ? "" : targetAmount}
              disabled={amountUnknown}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm disabled:bg-[var(--warm-100)] disabled:text-[var(--text-muted)]"
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
        <label className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={amountUnknown}
            onChange={(e) => {
              setAmountUnknown(e.target.checked);
              if (e.target.checked) setTargetAmount("");
            }}
            className="mt-0.5 size-4 accent-[var(--emerald)]"
          />
          <span className="font-body text-xs text-[var(--text-secondary)]">
            Not sure — I want to find out what this will cost
          </span>
        </label>
        <div className="mb-2 flex gap-1">
          {(["date", "age"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setHorizon(mode)}
              className={cn(
                "flex-1 rounded-lg py-2 font-display text-xs font-semibold",
                horizon === mode
                  ? "bg-[var(--emerald)] text-white"
                  : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
              )}
            >
              {mode === "date" ? "By date" : "By age"}
            </button>
          ))}
        </div>
        {horizon === "date" ? (
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            aria-label="Target date"
            className="mb-3 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
        ) : (
          <input
            type="number"
            min="1"
            max="120"
            value={targetAge}
            onChange={(e) => setTargetAge(e.target.value)}
            placeholder="Target age, e.g. 55"
            aria-label="Target age"
            className="mb-3 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
        )}
        {trackingClass !== "note" && (
          <div className="mb-4">
            <p className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {trackingClass === "debt" ? "Loan or mortgage" : "Accounts to watch"}
            </p>
            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {accounts
                .filter((account) => (trackingClass === "debt" ? account.side === "debt" : account.side === "asset"))
                .map((account) => (
                  <label key={account.key} className="flex items-center gap-2 font-body text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={linkedAccounts.includes(account.key)}
                      onChange={() =>
                        setLinkedAccounts((current) =>
                          current.includes(account.key)
                            ? current.filter((key) => key !== account.key)
                            : [...current, account.key],
                        )
                      }
                      className="size-4 accent-[var(--emerald)]"
                    />
                    {account.name}
                  </label>
                ))}
              {accounts.length === 0 && (
                <p className="font-body text-xs text-[var(--text-muted)]">Add a net-worth check-in to attach an account.</p>
              )}
            </div>
          </div>
        )}
        {(trackingClass === "balance" || trackingClass === "debt") && planChoices.length > 0 && (
          <div className="mb-4">
            <p className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">Plan lines to count</p>
            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {planChoices.map((choice) => (
                <label key={choice.slug} className="flex items-center gap-2 font-body text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={linkedPlans.includes(choice.slug)}
                    onChange={() =>
                      setLinkedPlans((current) =>
                        current.includes(choice.slug)
                          ? current.filter((slug) => slug !== choice.slug)
                          : [...current, choice.slug],
                      )
                    }
                    className="size-4 accent-[var(--emerald)]"
                  />
                  {choice.label}
                </label>
              ))}
            </div>
          </div>
        )}
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
