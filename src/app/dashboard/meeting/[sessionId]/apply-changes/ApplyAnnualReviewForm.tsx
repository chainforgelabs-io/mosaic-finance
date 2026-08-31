"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";

const SECTION_CONFIG: {
  id: string;
  label: string;
  hasData: (e: Record<string, unknown>) => boolean;
  hasInferred: (e: Record<string, unknown>) => boolean;
}[] = [
  {
    id: "income_changes",
    label: "Income",
    hasData: (e) => {
      const v = e.income_changes;
      if (!v || typeof v !== "object") return false;
      const o = v as Record<string, unknown>;
      return o.new_household_income != null || o.new_primary_income != null;
    },
    hasInferred: (e) => {
      const v = e.income_changes;
      if (!v || typeof v !== "object") return false;
      return (v as Record<string, unknown>).confidence === "inferred";
    },
  },
  {
    id: "expense_changes",
    label: "Expenses / savings",
    hasData: (e) => {
      const v = e.expense_changes;
      if (!v || typeof v !== "object") return false;
      const o = v as Record<string, unknown>;
      return o.new_monthly_expenses != null || o.new_monthly_savings != null;
    },
    hasInferred: (e) => {
      const v = e.expense_changes;
      if (!v || typeof v !== "object") return false;
      return (v as Record<string, unknown>).confidence === "inferred";
    },
  },
  {
    id: "new_debts",
    label: "New debts",
    hasData: (e) => Array.isArray(e.new_debts) && e.new_debts.length > 0,
    hasInferred: (e) =>
      Array.isArray(e.new_debts) &&
      e.new_debts.some(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as Record<string, unknown>).confidence === "inferred",
      ),
  },
  {
    id: "goal_updates",
    label: "Goal updates",
    hasData: (e) =>
      Array.isArray(e.goal_updates) && e.goal_updates.length > 0,
    hasInferred: (e) =>
      Array.isArray(e.goal_updates) &&
      e.goal_updates.some(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as Record<string, unknown>).confidence === "inferred",
      ),
  },
  {
    id: "goal_amount_or_timeline_changes",
    label: "Goal amounts / timelines",
    hasData: (e) =>
      Array.isArray(e.goal_amount_or_timeline_changes) &&
      e.goal_amount_or_timeline_changes.length > 0,
    hasInferred: (e) =>
      Array.isArray(e.goal_amount_or_timeline_changes) &&
      e.goal_amount_or_timeline_changes.some(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as Record<string, unknown>).confidence === "inferred",
      ),
  },
  {
    id: "household_changes",
    label: "Household members",
    hasData: (e) => {
      const v = e.household_changes;
      if (!v || typeof v !== "object") return false;
      const o = v as Record<string, unknown>;
      return (
        (Array.isArray(o.added) && o.added.length > 0) ||
        (Array.isArray(o.modified) && o.modified.length > 0)
      );
    },
    hasInferred: (e) => {
      const v = e.household_changes;
      if (!v || typeof v !== "object") return false;
      const o = v as Record<string, unknown>;
      const rows = [...(Array.isArray(o.added) ? o.added : []), ...(Array.isArray(o.modified) ? o.modified : [])];
      return rows.some(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as Record<string, unknown>).confidence === "inferred",
      );
    },
  },
  {
    id: "holdings_changes",
    label: "Investment accounts",
    hasData: (e) =>
      Array.isArray(e.holdings_changes) && e.holdings_changes.length > 0,
    hasInferred: (e) =>
      Array.isArray(e.holdings_changes) &&
      e.holdings_changes.some(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as Record<string, unknown>).confidence === "inferred",
      ),
  },
  {
    id: "fixed_asset_changes",
    label: "Fixed assets (home, etc.)",
    hasData: (e) =>
      Array.isArray(e.fixed_asset_changes) &&
      e.fixed_asset_changes.length > 0,
    hasInferred: (e) =>
      Array.isArray(e.fixed_asset_changes) &&
      e.fixed_asset_changes.some(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as Record<string, unknown>).confidence === "inferred",
      ),
  },
  {
    id: "risk_tolerance_change",
    label: "Risk tolerance",
    hasData: (e) => {
      const v = e.risk_tolerance_change;
      if (!v || typeof v !== "object") return false;
      return (v as Record<string, unknown>).changed === true;
    },
    hasInferred: (e) => {
      const v = e.risk_tolerance_change;
      if (!v || typeof v !== "object") return false;
      return (v as Record<string, unknown>).confidence === "inferred";
    },
  },
];

function defaultApplyMap(extracted: Record<string, unknown>): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const s of SECTION_CONFIG) {
    if (s.hasData(extracted)) m[s.id] = true;
  }
  return m;
}

export function ApplyAnnualReviewForm({
  sessionId,
  initialExtracted,
}: {
  sessionId: string;
  initialExtracted: Record<string, unknown>;
}) {
  const [extractedJson, setExtractedJson] = useState(() =>
    JSON.stringify(initialExtracted, null, 2),
  );
  const [apply, setApply] = useState<Record<string, boolean>>(() =>
    defaultApplyMap(initialExtracted),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => {
    try {
      const x = JSON.parse(extractedJson) as unknown;
      if (x && typeof x === "object" && !Array.isArray(x)) {
        return { ok: true as const, data: x as Record<string, unknown> };
      }
      return { ok: false as const, error: "Root must be a JSON object" };
    } catch {
      return { ok: false as const, error: "Invalid JSON" };
    }
  }, [extractedJson]);

  const visibleSections = useMemo(
    () =>
      SECTION_CONFIG.filter((s) =>
        parsed.ok ? s.hasData(parsed.data) : false,
      ),
    [parsed],
  );

  const anySectionApplied =
    visibleSections.length > 0 &&
    visibleSections.some((s) => apply[s.id] !== false);

  const toggleSection = useCallback((id: string, checked: boolean) => {
    setApply((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conversation/session/${sessionId}/apply-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apply,
            extracted: parsed.data,
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof body.error === "string"
            ? body.error
            : "Something went wrong",
        );
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[720px] space-y-6 px-4 py-8">
      <div>
        <Link
          href="/dashboard/meeting"
          className="font-body text-[13px] font-medium text-[var(--emerald)] hover:underline"
        >
          &larr; Back to meetings
        </Link>
        <h1 className="mt-4 font-display text-[24px] font-bold text-[var(--text-primary)]">
          Review changes from Charlie
        </h1>
        <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
          Toggle which updates to save to your profile. Edit the JSON if any
          numbers need correcting. Applying will supersede your previous report
          and generate a new Progress Report.
        </p>
      </div>

      {visibleSections.length === 0 && parsed.ok && (
        <div className="rounded-xl border border-[var(--warm-200)] bg-[var(--warm-50)] p-5">
          <p className="font-body text-[14px] text-[var(--text-secondary)]">
            Charlie did not record structured updates (debts, income, goals,
            etc.) in this review. You can still read the conversation above; if
            something is missing, run another review or update your profile
            manually in Assets and Financial Profile.
          </p>
        </div>
      )}

      {visibleSections.length > 0 && (
        <div className="rounded-xl border border-[var(--warm-200)] bg-white p-5">
          <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] mb-3">
            Sections to apply
          </h2>
          <ul className="space-y-2">
            {visibleSections.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--warm-100)] bg-[var(--warm-50)]/50 px-3 py-2"
              >
                <input
                  type="checkbox"
                  id={s.id}
                  checked={apply[s.id] !== false}
                  onChange={(e) => toggleSection(s.id, e.target.checked)}
                  className="mt-1 accent-[var(--emerald)]"
                />
                <label htmlFor={s.id} className="flex-1 cursor-pointer">
                  <span className="font-body text-[14px] font-medium text-[var(--text-primary)]">
                    {s.label}
                  </span>
                  {parsed.ok && s.hasInferred(parsed.data) && (
                    <span className="mt-1 flex items-center gap-1 font-body text-[12px] text-amber-700">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      Charlie inferred part of this — double-check before applying.
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label
          htmlFor="extracted-json"
          className="font-display text-[14px] font-semibold text-[var(--text-primary)]"
        >
          Structured review data (JSON)
        </label>
        <textarea
          id="extracted-json"
          value={extractedJson}
          onChange={(e) => setExtractedJson(e.target.value)}
          rows={18}
          className="mt-2 w-full resize-y rounded-xl border border-[var(--warm-200)] bg-white p-4 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
          spellCheck={false}
        />
        {!parsed.ok && (
          <p className="mt-2 font-body text-[13px] text-[var(--error)]">
            {parsed.error}
          </p>
        )}
      </div>

      {error && (
        <p className="font-body text-[14px] text-[var(--error)]">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            loading ||
            !parsed.ok ||
            visibleSections.length === 0 ||
            !anySectionApplied
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-45"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {loading ? "Applying…" : "Apply to profile & regenerate report"}
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-xl border border-[var(--warm-200)] px-6 py-2.5 font-body text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--warm-50)]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
