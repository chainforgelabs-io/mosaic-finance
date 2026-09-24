"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, Trash2 } from "lucide-react";
import { StepProgress } from "@/components/app/StepProgress";
import { MosaicLogo } from "@/components/app/MosaicLogo";
import { useOnboardingStore } from "@/stores/onboarding";
import {
  GOAL_PRIORITIES,
  GOAL_TYPE_LABELS,
  GOAL_TYPES,
  inferGoalType,
  type GoalPriority,
  type GoalType,
} from "@/lib/tracking/categories";
import { goalDraftToPayload, horizonFromStored, type GoalHorizon } from "@/lib/tracking/goal-draft";
import { cn } from "@/lib/utils";

interface DraftGoal {
  key: string;
  name: string;
  goal_type: GoalType;
  target_amount: string;
  amount_unknown: boolean;
  horizon: GoalHorizon;
  target_date: string;
  target_age: string;
  priority: GoalPriority;
}

function emptyGoal(): DraftGoal {
  return {
    key: crypto.randomUUID(),
    name: "",
    goal_type: "savings",
    target_amount: "",
    amount_unknown: false,
    horizon: "date",
    target_date: "",
    target_age: "",
    priority: "medium",
  };
}

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const { completedSteps, setCurrentStep, completeStep } = useOnboardingStore();
  const [goals, setGoals] = useState<DraftGoal[]>([emptyGoal()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    completeStep("profile");
    completeStep("fact-find");
    setCurrentStep("goals");
  }, [completeStep, setCurrentStep]);

  useEffect(() => {
    fetch("/api/goals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const existing = (json?.goals ?? []) as {
          name: string;
          goal_type: GoalType;
          target_amount: number | null;
          target_date: string | null;
          target_age: number | null;
          amount_unknown: boolean | null;
          priority: GoalPriority;
        }[];
        if (existing.length > 0) {
          setGoals(
            existing.map((g) => ({
              key: crypto.randomUUID(),
              name: g.name,
              goal_type: inferGoalType(g.goal_type),
              target_amount: g.target_amount != null ? String(g.target_amount) : "",
              amount_unknown: Boolean(g.amount_unknown),
              horizon: horizonFromStored(g),
              target_date: g.target_date ?? "",
              target_age: g.target_age != null ? String(g.target_age) : "",
              priority: g.priority ?? "medium",
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function continueOnboarding() {
    setSaving(true);
    const valid = goals.filter((g) => g.name.trim().length > 0);
    if (valid.length > 0) {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          goals: valid.map((g) => ({
            ...goalDraftToPayload(g),
            source: "onboarding",
          })),
          replace: true,
        }),
      });
    }
    completeStep("goals");
    router.push("/onboarding/risk-profile");
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-2 flex justify-center">
          <MosaicLogo size="sm" />
        </div>
        <StepProgress currentStep="goals" completedSteps={completedSteps} className="mb-8" />

        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-4 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--emerald-soft)]">
              <Target className="size-5 text-[var(--emerald-dark)]" />
            </div>
            <h1 className="font-display text-xl font-bold text-[var(--text-primary)] sm:text-[24px]">
              What are you working toward?
            </h1>
            <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
              Charlie captured these from your conversation. Edit them, add more, or skip — you can change them later.
            </p>
          </div>

          {loading ? (
            <div className="skeleton h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {goals.map((g, i) => (
                <div key={g.key} className="rounded-lg border border-[var(--warm-200)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-display text-sm font-semibold">Goal {i + 1}</p>
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGoals(goals.filter((x) => x.key !== g.key))}
                        className="text-[var(--text-muted)] hover:text-[var(--error)]"
                        aria-label="Remove goal"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <input
                    value={g.name}
                    onChange={(e) =>
                      setGoals(goals.map((x) => (x.key === g.key ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="e.g. Emergency fund, pay off credit card"
                    className="mb-3 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={g.goal_type}
                      onChange={(e) =>
                        setGoals(
                          goals.map((x) =>
                            x.key === g.key ? { ...x, goal_type: e.target.value as GoalType } : x,
                          ),
                        )
                      }
                      className="rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
                    >
                      {GOAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {GOAL_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <div>
                      <input
                        type="number"
                        min="0"
                        value={g.amount_unknown ? "" : g.target_amount}
                        disabled={g.amount_unknown}
                        onChange={(e) =>
                          setGoals(
                            goals.map((x) =>
                              x.key === g.key ? { ...x, target_amount: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="Target amount"
                        className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm disabled:bg-[var(--warm-100)] disabled:text-[var(--text-muted)]"
                      />
                      <label className="mt-2 flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={g.amount_unknown}
                          onChange={(e) =>
                            setGoals(
                              goals.map((x) =>
                                x.key === g.key
                                  ? {
                                      ...x,
                                      amount_unknown: e.target.checked,
                                      target_amount: e.target.checked ? "" : x.target_amount,
                                    }
                                  : x,
                              ),
                            )
                          }
                          className="mt-0.5 size-4 accent-[var(--emerald)]"
                        />
                        <span className="font-body text-xs text-[var(--text-secondary)]">
                          Not sure — I want to find out what this will cost
                        </span>
                      </label>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-2 flex gap-1">
                        {(["date", "age"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              setGoals(
                                goals.map((x) => (x.key === g.key ? { ...x, horizon: mode } : x)),
                              )
                            }
                            className={cn(
                              "flex-1 rounded-lg py-2 font-display text-[11px] font-semibold",
                              g.horizon === mode
                                ? "bg-[var(--emerald)] text-white"
                                : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
                            )}
                          >
                            {mode === "date" ? "By date" : "By age"}
                          </button>
                        ))}
                      </div>
                      {g.horizon === "date" ? (
                        <input
                          type="date"
                          value={g.target_date}
                          onChange={(e) =>
                            setGoals(
                              goals.map((x) =>
                                x.key === g.key ? { ...x, target_date: e.target.value } : x,
                              ),
                            )
                          }
                          aria-label="Target date"
                          className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
                        />
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={g.target_age}
                          onChange={(e) =>
                            setGoals(
                              goals.map((x) =>
                                x.key === g.key ? { ...x, target_age: e.target.value } : x,
                              ),
                            )
                          }
                          placeholder="Target age, e.g. 55"
                          aria-label="Target age"
                          className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
                        />
                      )}
                    </div>
                    <div className="flex gap-1 sm:col-span-2">
                      {GOAL_PRIORITIES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setGoals(goals.map((x) => (x.key === g.key ? { ...x, priority: p } : x)))
                          }
                          className={cn(
                            "flex-1 rounded-lg py-2 font-display text-[11px] font-semibold capitalize",
                            g.priority === p
                              ? "bg-[var(--emerald)] text-white"
                              : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setGoals([...goals, emptyGoal()])}
                className="inline-flex items-center gap-2 font-display text-sm font-semibold text-[var(--emerald)]"
              >
                <Plus className="size-4" />
                Add another goal
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                completeStep("goals");
                router.push("/onboarding/risk-profile");
              }}
              className="flex-1 rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={continueOnboarding}
              disabled={saving}
              className="flex-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
