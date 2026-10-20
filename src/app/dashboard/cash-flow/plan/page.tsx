"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, History, LayoutList, Loader2, Upload } from "lucide-react";
import { BudgetPlanGrid } from "@/components/tracking/BudgetPlanGrid";
import { LedgerSetup, type LedgerSetupInput } from "@/components/tracking/LedgerSetup";
import { UnlockToast, type UnlockItem } from "@/components/tracking/UnlockToast";
import {
  CATEGORY_KIND_LABELS,
  categorySlug,
  labelFor,
  type UserCategory,
} from "@/lib/tracking/categories";
import {
  entriesFromSuggestions,
  fillAcrossMonths,
  ledgerFromRows,
  monthsOfYear,
  planFromHistory,
  planFromStatementLines,
  planKey,
  presetSuggestions,
  PLAN_KINDS,
  type PlanKind,
  type PlanSuggestion,
} from "@/lib/tracking/budget-plan";
import { isSpreadsheetFile, readPlanFile } from "@/lib/tracking/plan-spreadsheet";
import { addMonths, startOfMonth, todayIso } from "@/lib/tracking/dates";
import { formatMoney } from "@/lib/tracking/format";
import {
  fetchCatalog,
  fetchPlan,
  migrateLocalCategories,
  saveCategory,
  savePlan,
} from "@/lib/tracking/plan-client";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry, CashAnchor, ParsedSpendingItem, TransactionRow } from "@/types/tracking";

type SetupSource = "statements" | "history" | "preset";

interface SuggestionRow extends PlanSuggestion {
  included: boolean;
}

export default function BudgetPlanPage() {
  const today = todayIso();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [focusMonth, setFocusMonth] = useState(() => startOfMonth(today));
  const [entries, setEntries] = useState<BudgetPlanEntry[]>([]);
  const [catalog, setCatalog] = useState<UserCategory[]>([]);
  const [hasAnyPlan, setHasAnyPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [source, setSource] = useState<SetupSource | null>(null);
  const [working, setWorking] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionRow[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);
  const [anchor, setAnchor] = useState<CashAnchor | null>(null);
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const months = useMemo(() => monthsOfYear(year), [year]);

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    const [plan, rawCatalog, cashRes] = await Promise.all([
      fetchPlan(targetYear),
      fetchCatalog(),
      fetch("/api/cash", { credentials: "include" }),
    ]);
    if (cashRes.ok) {
      const cash = await cashRes.json();
      setAnchor((cash.anchor as CashAnchor | null) ?? null);
    }
    const merged = await migrateLocalCategories(rawCatalog);
    setEntries(plan.entries);
    setHasAnyPlan(plan.hasAnyPlan);
    setCatalog(merged);
    setSetupOpen(!plan.hasAnyPlan);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(year);
  }, [load, year]);

  useEffect(() => {
    if (!months.includes(focusMonth)) {
      const current = startOfMonth(today);
      setFocusMonth(months.includes(current) ? current : months[0]);
    }
  }, [months, focusMonth, today]);

  function upsertLocal(next: BudgetPlanEntry[]) {
    setEntries((prev) => {
      const map = new Map(prev.map((entry) => [planKey(entry.kind, entry.category, entry.month), entry]));
      for (const entry of next) map.set(planKey(entry.kind, entry.category, entry.month), entry);
      return [...map.values()];
    });
  }

  async function persist(next: BudgetPlanEntry[], remove?: Array<{ kind: PlanKind; category: string }>) {
    setSaveError(null);
    const ok = await savePlan(next, remove);
    if (!ok) {
      setSaveError("Could not save that change. Check your connection and try again.");
      await load(year);
      return;
    }
    if (next.length > 0) setHasAnyPlan(true);
  }

  function handleSetAmount(kind: PlanKind, category: string, month: string, amount: number) {
    const entry = { kind, category, month, amount };
    upsertLocal([entry]);
    void persist([entry]);
  }

  function handleFillRight(kind: PlanKind, category: string, month: string, amount: number) {
    const filled = fillAcrossMonths(kind, category, month, amount, months);
    upsertLocal(filled);
    void persist(filled);
  }

  function handleApplySchedule(kind: PlanKind, category: string, amounts: { month: string; amount: number }[]) {
    const next = amounts.map((slot) => ({ kind, category, month: slot.month, amount: slot.amount }));
    upsertLocal(next);
    void persist(next);
  }

  function handleRemoveRow(kind: PlanKind, category: string) {
    setEntries((prev) => prev.filter((entry) => !(entry.kind === kind && entry.category === category)));
    void persist([], [{ kind, category }]);
  }

  function handleAddRow(kind: PlanKind, category: string) {
    const blank = months.map((month) => ({ kind, category, month, amount: 0 }));
    upsertLocal(blank);
    void persist(blank);
  }

  async function handleCreateCategory(kind: PlanKind, label: string): Promise<string | null> {
    const slug = categorySlug(label);
    if (!slug) return null;
    const saved = await saveCategory({ slug, label: label.trim(), kind });
    if (!saved) return null;
    setCatalog((prev) => [...prev.filter((row) => row.slug !== saved.slug), saved]);
    return saved.slug;
  }

  async function buildFromDocuments(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const spreadsheets = list.filter((file) => isSpreadsheetFile(file));
    const statements = list.filter((file) => !isSpreadsheetFile(file));
    setWorking(true);
    setSetupError(null);
    setBanner(null);
    const notes: string[] = [];
    try {
      let imported = 0;
      for (const file of spreadsheets) {
        try {
          const parsed = await readPlanFile(file, year);
          if (parsed.entries.length === 0) {
            notes.push(
              `${file.name} did not have income, expenses, or savings we could read. Use a name column and month columns (Jan–Dec), or columns for name, kind, and amount.`,
            );
            continue;
          }
          for (const category of parsed.categories) {
            const saved = await saveCategory(category);
            if (saved) {
              setCatalog((prev) => [...prev.filter((row) => row.slug !== saved.slug), saved]);
            }
          }
          const ok = await savePlan(parsed.entries);
          if (!ok) {
            notes.push(`Could not save the rows from ${file.name}.`);
            continue;
          }
          upsertLocal(parsed.entries);
          imported += parsed.categories.length;
          setHasAnyPlan(true);
        } catch (error) {
          const code = error instanceof Error ? error.message : "";
          if (code === "xls" || code === "not-xlsx") {
            notes.push(`${file.name}: save it as .xlsx or .csv, then upload it again.`);
          } else {
            notes.push(`Could not read ${file.name}.`);
          }
        }
      }
      if (imported > 0) {
        notes.unshift(
          imported === 1
            ? "Added 1 row from the spreadsheet. You can edit any month."
            : `Added ${imported} rows from the spreadsheet. You can edit any month.`,
        );
        if (statements.length === 0) setSetupOpen(false);
      }

      if (statements.length > 0) {
        const lines: ParsedSpendingItem[] = [];
        const failures: string[] = [];
        let denied = false;
        for (const file of statements) {
          const fd = new FormData();
          fd.append("files", file);
          const res = await fetch("/api/upload/spending", { method: "POST", body: fd, credentials: "include" });
          const json = await res.json().catch(() => ({}));
          if (res.status === 402) {
            denied = true;
            break;
          }
          if (!res.ok) {
            failures.push(file.name);
            continue;
          }
          for (const line of (json.transactions ?? []) as ParsedSpendingItem[]) lines.push(line);
        }
        if (denied) {
          notes.push(
            "Bank and card statements are read on Progress. A CSV or Excel file of your plan can be uploaded on any plan.",
          );
        } else if (lines.length === 0) {
          notes.push(failures.length > 0 ? `Could not read ${failures.join(", ")}.` : "Could not read those files.");
        } else {
          const rows = planFromStatementLines(lines, today);
          if (rows.length === 0) notes.push("Those statements did not have dated lines we could average.");
          else setSuggestions(rows.map((row) => ({ ...row, included: true })));
        }
      }

      const message = notes.filter(Boolean).join(" ");
      if (message) setBanner(message);
    } catch {
      setSetupError("Upload failed. Try again.");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function buildFromHistory() {
    setWorking(true);
    setSetupError(null);
    try {
      const start = startOfMonth(addMonths(today, -4));
      const res = await fetch(`/api/transactions?start=${start}&end=${today}`, { credentials: "include" });
      if (!res.ok) {
        setSetupError("Could not load what you have logged.");
        return;
      }
      const json = await res.json();
      const rows = planFromHistory((json.transactions ?? []) as TransactionRow[], today);
      if (rows.length === 0) {
        setSetupError("There are no full months of logging yet. Log for a month, or start from a template.");
        return;
      }
      setSuggestions(rows.map((row) => ({ ...row, included: true })));
    } finally {
      setWorking(false);
    }
  }

  async function saveLedger(input: LedgerSetupInput) {
    setLedgerSaving(true);
    setLedgerError(null);
    try {
      if (input.startingBalance != null) {
        const res = await fetch("/api/cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            starting_balance: input.startingBalance,
            anchor_date: input.anchorDate,
            ...(input.owedBalance != null ? { owed_balance: input.owedBalance } : {}),
          }),
        });
        if (!res.ok) {
          setLedgerError("Could not save the bank balance.");
          return;
        }
        setAnchor({
          starting_balance: input.startingBalance,
          anchor_date: input.anchorDate,
          owed_balance: input.owedBalance,
          owed_as_of: input.owedBalance != null ? input.anchorDate : anchor?.owed_as_of ?? null,
        });
      }

      const built = ledgerFromRows(input.rows, year);
      if (built.entries.length === 0) {
        setLedgerError("Add at least one named amount.");
        return;
      }
      for (const category of built.categories) {
        const saved = await saveCategory({ slug: category.slug, label: category.label, kind: category.kind });
        if (saved) {
          setCatalog((prev) => [...prev.filter((row) => row.slug !== saved.slug), saved]);
        }
      }
      const ok = await savePlan(built.entries);
      if (!ok) {
        setLedgerError("Could not save the plan.");
        return;
      }
      upsertLocal(built.entries);
      setHasAnyPlan(true);

      const schedules = await Promise.all(
        built.schedules.map((item) =>
          fetch("/api/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(item),
          }),
        ),
      );
      setSetupOpen(false);
      if (schedules.some((res) => !res.ok)) {
        setSaveError(
          "The monthly plan is saved. A repeating date could not be saved. Twice a month, every 6 months, and yearly need the latest database update.",
        );
      }
    } finally {
      setLedgerSaving(false);
    }
  }

  async function applyPreset() {
    setApplying(true);
    const next = entriesFromSuggestions(presetSuggestions(), year);
    upsertLocal(next);
    await persist(next);
    setApplying(false);
    setSetupOpen(false);
    setSource(null);
  }

  async function applySuggestions() {
    if (!suggestions) return;
    const chosen = suggestions.filter((row) => row.included && row.monthly >= 0);
    if (chosen.length === 0) return;
    setApplying(true);
    const next = entriesFromSuggestions(chosen, year);
    upsertLocal(next);
    const res = await fetch("/api/budget-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entries: next }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
      setHasAnyPlan(true);
    } else {
      setSaveError("Could not save the plan. Try again.");
      await load(year);
    }
    setApplying(false);
    setSuggestions(null);
    setSetupOpen(false);
    setSource(null);
  }

  const currentYear = Number(today.slice(0, 4));

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Budget plan</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Set what you expect each month for money in, expenses, and savings. Tracking compares against this.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-[var(--warm-200)] bg-white">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="rounded-l-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)]"
              aria-label="Previous year"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="px-2 font-display text-sm font-semibold tabular-nums">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear + 1}
              className="rounded-r-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
              aria-label="Next year"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          {hasAnyPlan && !setupOpen && (
            <button
              type="button"
              onClick={() => {
                setSetupOpen(true);
                setSource(null);
                setSuggestions(null);
                setSetupError(null);
              }}
              className="rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-display text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--warm-100)]"
            >
              Prefill
            </button>
          )}
        </div>
      </div>

      {saveError && <p className="font-body text-sm text-[var(--error)]">{saveError}</p>}
      {banner && <p className="font-body text-sm text-[var(--text-secondary)]">{banner}</p>}

      {setupOpen && !hasAnyPlan && !suggestions && (
        <LedgerSetup
          key={anchor ? `${anchor.anchor_date}-${anchor.starting_balance}` : "no-anchor"}
          anchor={anchor}
          saving={ledgerSaving}
          error={ledgerError}
          onSave={saveLedger}
        />
      )}

      {setupOpen && !suggestions && (
        <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            {hasAnyPlan ? `Prefill ${year}` : "Or start another way"}
          </h2>
          <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
            {hasAnyPlan
              ? "Start from real numbers so the first month is not a guess. Every amount can be changed after."
              : "Upload a spreadsheet or statements, use what you have already logged, or start from common categories."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SetupCard
              icon={<Upload className="size-5" />}
              title="From your documents"
              body="Upload a CSV or Excel plan, or bank and card statements. A spreadsheet fills the plan on any plan. Reading statements is on Progress."
              action={working && source === "statements" ? "Reading…" : "Upload documents"}
              busy={working && source === "statements"}
              onClick={() => {
                setSource("statements");
                fileRef.current?.click();
              }}
            />
            <SetupCard
              icon={<History className="size-5" />}
              title="From what you've logged"
              body="Use the last three full months of entries from Track as the starting average."
              action={working && source === "history" ? "Averaging…" : "Use my history"}
              busy={working && source === "history"}
              onClick={() => {
                setSource("history");
                void buildFromHistory();
              }}
            />
            <SetupCard
              icon={<LayoutList className="size-5" />}
              title="Start from a template"
              body="Common Canadian categories with blank amounts. Fill in what you know."
              action={applying && source === "preset" ? "Adding…" : "Use the template"}
              busy={applying && source === "preset"}
              onClick={() => {
                setSource("preset");
                void applyPreset();
              }}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/*,.heic,.heif,.heics,application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(event) => void buildFromDocuments(event.target.files)}
          />
          {setupError && <p className="mt-3 font-body text-sm text-[var(--error)]">{setupError}</p>}
          {hasAnyPlan && (
            <button
              type="button"
              onClick={() => setSetupOpen(false)}
              className="mt-3 font-display text-sm font-semibold text-[var(--text-muted)]"
            >
              Cancel
            </button>
          )}
        </section>
      )}

      {suggestions && (
        <SuggestionReview
          year={year}
          rows={suggestions}
          catalog={catalog}
          applying={applying}
          onToggle={(i) =>
            setSuggestions((prev) =>
              prev ? prev.map((row, idx) => (idx === i ? { ...row, included: !row.included } : row)) : prev,
            )
          }
          onAmount={(i, monthly) =>
            setSuggestions((prev) => (prev ? prev.map((row, idx) => (idx === i ? { ...row, monthly } : row)) : prev))
          }
          onCancel={() => setSuggestions(null)}
          onApply={() => void applySuggestions()}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      ) : (
        (entries.length > 0 || !setupOpen) && (
          <BudgetPlanGrid
            year={year}
            months={months}
            entries={entries}
            catalog={catalog}
            focusMonth={focusMonth}
            onFocusMonth={setFocusMonth}
            onSetAmount={handleSetAmount}
            onFillRight={handleFillRight}
            onRemoveRow={handleRemoveRow}
            onAddRow={handleAddRow}
            onCreateCategory={handleCreateCategory}
            onApplySchedule={handleApplySchedule}
          />
        )
      )}

      {!loading && entries.length === 0 && hasAnyPlan && !setupOpen && (
        <p className="font-body text-sm text-[var(--text-muted)]">
          Nothing planned for {year} yet. Add a row above, or use Prefill to copy averages in.
        </p>
      )}

      <p className="font-body text-xs text-[var(--text-muted)]">
        Tip: click a category to fill the year from one payment, how often it happens, and the last payment date.
        You can still edit any month. Tracking, budgets, and this plan are always free.
      </p>

      <UnlockToast unlocks={unlocks} onDismiss={() => setUnlocks([])} />
    </div>
  );
}

function SetupCard({
  icon,
  title,
  body,
  action,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] p-4">
      <div className="flex items-center gap-2 text-[var(--emerald-dark)]">
        {icon}
        <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <p className="mt-2 flex-1 font-body text-xs text-[var(--text-secondary)]">{body}</p>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--slate-950)] px-3 py-2 font-display text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {action}
      </button>
    </div>
  );
}

function SuggestionReview({
  year,
  rows,
  catalog,
  applying,
  onToggle,
  onAmount,
  onCancel,
  onApply,
}: {
  year: number;
  rows: SuggestionRow[];
  catalog: UserCategory[];
  applying: boolean;
  onToggle: (index: number) => void;
  onAmount: (index: number, monthly: number) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const totals = PLAN_KINDS.map((kind) => ({
    kind,
    total: rows.filter((row) => row.kind === kind && row.included).reduce((sum, row) => sum + row.monthly, 0),
  }));
  const income = totals.find((t) => t.kind === "income")?.total ?? 0;
  const out = totals.filter((t) => t.kind !== "income").reduce((sum, t) => sum + t.total, 0);

  return (
    <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            <FileText className="mr-2 inline size-5 text-[var(--emerald-dark)]" />
            Monthly averages
          </h2>
          <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
            Untick anything that should not be in the plan, or change an amount. Each one is copied into every
            month of {year}.
          </p>
        </div>
        <p className="shrink-0 text-right font-body text-xs text-[var(--text-muted)]">
          Income {formatMoney(income)}
          <br />
          Out {formatMoney(out)}
        </p>
      </div>
      <div className="mt-4 space-y-4">
        {PLAN_KINDS.map((kind) => {
          const indexed = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.kind === kind);
          if (indexed.length === 0) return null;
          return (
            <div key={kind}>
              <h3 className="mb-1 font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {CATEGORY_KIND_LABELS[kind]}
              </h3>
              <div className="divide-y divide-[var(--warm-100)] rounded-lg border border-[var(--warm-200)]">
                {indexed.map(({ row, index }) => (
                  <label
                    key={`${row.kind}-${row.category}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2",
                      !row.included && "opacity-50",
                    )}
                  >
                    <input type="checkbox" checked={row.included} onChange={() => onToggle(index)} />
                    <span className="min-w-0 flex-1 truncate font-body text-sm text-[var(--text-primary)]">
                      {labelFor(catalog, row.category)}
                      {row.isNeed && (
                        <span className="ml-2 rounded-full bg-[var(--warm-100)] px-1.5 py-0.5 font-body text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          need
                        </span>
                      )}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={row.monthly}
                      onChange={(event) => onAmount(index, Math.max(0, Number(event.target.value) || 0))}
                      className="w-28 rounded-lg border border-[var(--warm-200)] px-2 py-1 text-right font-body text-sm tabular-nums"
                      aria-label={`Monthly amount for ${labelFor(catalog, row.category)}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={applying}
          onClick={onApply}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] disabled:opacity-60"
        >
          {applying && <Loader2 className="size-4 animate-spin" />}
          Use these for {year}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 font-display text-sm font-semibold text-[var(--text-muted)]"
        >
          Back
        </button>
      </div>
    </section>
  );
}
