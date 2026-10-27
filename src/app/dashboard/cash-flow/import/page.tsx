"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImportExpenses } from "@/components/tracking/ImportExpenses";
import { fetchPlan, persistCustomCategory } from "@/lib/tracking/plan-client";
import { buildStatementBaseline } from "@/lib/tracking/statement-baseline";
import { rowsForPicture } from "@/lib/tracking/import-session";
import { todayIso } from "@/lib/tracking/dates";
import {
  alignImportRows,
  getImportSession,
  patchImportRows,
  planCategoryLists,
  saveImportRows,
  setImportSession,
  subscribeImportSession,
  type ImportRow,
  type PlanCategoryLists,
  type PlanMenuKind,
} from "@/lib/tracking/import-session";

const EMPTY_ADDED: Record<PlanMenuKind, string[]> = { expense: [], income: [], savings: [] };

export default function ImportExpensesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [categories, setCategories] = useState<PlanCategoryLists | null>(null);
  const [added, setAdded] = useState(EMPTY_ADDED);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      const current = getImportSession();
      if (current.status !== "ready" || !current.rows?.length) {
        setRows(null);
        return;
      }
      setRows(current.rows);
      setNotice(current.notice);
    }
    sync();
    return subscribeImportSession(sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPlan(Number(todayIso().slice(0, 4))).then((plan) => {
      if (cancelled) return;
      const lists = planCategoryLists(plan.schedules);
      const current = getImportSession();
      if (current.status === "ready" && current.rows && !current.aligned) {
        setImportSession({
          ...current,
          rows: alignImportRows(current.rows, lists),
          aligned: true,
        });
      }
      setCategories(lists);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const current = getImportSession();
    if (current.status === "parsing") return;
    if (current.status !== "ready" || !current.rows?.length) {
      router.replace("/dashboard/cash-flow");
    }
  }, [router, rows]);

  if (!rows || !categories || !getImportSession().aligned) return null;

  const hasPicture = buildStatementBaseline(rowsForPicture(rows), todayIso()) != null;

  return (
    <ImportExpenses
      rows={rows}
      notice={notice}
      categories={categories}
      added={added}
      hasPicture={hasPicture}
      saving={saving}
      saveError={saveError}
      onChange={(next) => {
        setRows(next);
        patchImportRows(next);
      }}
      onAddCategory={(slug, kind) => {
        setAdded((prev) => ({ ...prev, [kind]: [...new Set([...prev[kind], slug])] }));
        void persistCustomCategory(slug, kind);
      }}
      onSave={() => {
        setSaving(true);
        setSaveError(null);
        void saveImportRows(rows)
          .then(() => {
            setImportSession({ status: "idle", rows: null, notice: null, error: null });
            router.push("/dashboard/cash-flow");
          })
          .catch((error: unknown) => {
            setSaveError(error instanceof Error ? error.message : "Could not save those expenses.");
            setSaving(false);
          });
      }}
    />
  );
}
