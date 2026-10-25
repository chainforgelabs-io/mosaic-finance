"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImportExpenses } from "@/components/tracking/ImportExpenses";
import { extraSlugs, fetchCatalog, migrateLocalCategories, persistCustomCategory } from "@/lib/tracking/plan-client";
import { buildStatementBaseline } from "@/lib/tracking/statement-baseline";
import { rowsForPicture } from "@/lib/tracking/import-session";
import { todayIso } from "@/lib/tracking/dates";
import {
  getImportSession,
  patchImportRows,
  saveImportRows,
  setImportSession,
  subscribeImportSession,
  type ImportRow,
} from "@/lib/tracking/import-session";

const CUSTOM_CATEGORY_KEY = "mosaic-custom-categories";

function loadCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_CATEGORY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberCategory(slug: string) {
  const known = loadCustomCategories();
  if (known.includes(slug)) return;
  localStorage.setItem(CUSTOM_CATEGORY_KEY, JSON.stringify([...known, slug]));
}

export default function ImportExpensesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
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
    fetchCatalog()
      .then((catalog) => migrateLocalCategories(catalog))
      .then((catalog) => {
        if (cancelled) return;
        setExtras([...new Set([...loadCustomCategories(), ...extraSlugs(catalog)])]);
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

  if (!rows) return null;

  const hasPicture = buildStatementBaseline(rowsForPicture(rows), todayIso()) != null;

  return (
    <ImportExpenses
      rows={rows}
      notice={notice}
      extras={extras}
      hasPicture={hasPicture}
      saving={saving}
      saveError={saveError}
      onChange={(next) => {
        setRows(next);
        patchImportRows(next);
      }}
      onAddCategory={(slug) => {
        rememberCategory(slug);
        setExtras((prev) => [...new Set([...prev, slug])]);
        void persistCustomCategory(slug);
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
