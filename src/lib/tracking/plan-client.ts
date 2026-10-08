"use client";

import type { BudgetPlanEntry } from "@/types/tracking";
import type { CategoryKind, UserCategory } from "@/lib/tracking/categories";
import { categoryKind, categoryLabel } from "@/lib/tracking/categories";

export const CUSTOM_CATEGORY_KEY = "mosaic-custom-categories";
const CUSTOM_MIGRATED_KEY = "mosaic-custom-categories-synced";

export async function fetchCatalog(): Promise<UserCategory[]> {
  const res = await fetch("/api/categories", { credentials: "include" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.categories ?? []) as UserCategory[];
}

export async function saveCategory(row: {
  slug: string;
  label: string;
  kind: CategoryKind;
  is_need?: boolean;
}): Promise<UserCategory | null> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ categories: [row] }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.categories?.[0] as UserCategory) ?? null;
}

export async function patchCategory(
  slug: string,
  updates: Partial<Pick<UserCategory, "label" | "kind" | "is_need" | "archived" | "sort_order">>,
): Promise<UserCategory | null> {
  const res = await fetch("/api/categories", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ slug, ...updates }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.category as UserCategory) ?? null;
}

/**
 * Custom categories used to live only in this browser. Push them to the catalog once
 * so they show up on every device and in the plan grid.
 */
export async function migrateLocalCategories(catalog: UserCategory[]): Promise<UserCategory[]> {
  if (typeof window === "undefined") return catalog;
  if (localStorage.getItem(CUSTOM_MIGRATED_KEY) === "1") return catalog;
  let local: string[] = [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    local = Array.isArray(parsed) ? parsed.filter((slug) => typeof slug === "string") : [];
  } catch {
    local = [];
  }
  const known = new Set(catalog.map((row) => row.slug));
  const missing = local.filter((slug) => /^[a-z][a-z0-9_]{0,39}$/.test(slug) && !known.has(slug));
  if (missing.length === 0) {
    localStorage.setItem(CUSTOM_MIGRATED_KEY, "1");
    return catalog;
  }
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      categories: missing.map((slug) => ({
        slug,
        label: categoryLabel(slug),
        kind: categoryKind(slug),
      })),
    }),
  });
  if (!res.ok) return catalog;
  localStorage.setItem(CUSTOM_MIGRATED_KEY, "1");
  const json = await res.json();
  return [...catalog, ...((json.categories ?? []) as UserCategory[])];
}

export async function fetchPlan(year: number): Promise<{ entries: BudgetPlanEntry[]; hasAnyPlan: boolean }> {
  const res = await fetch(`/api/budget-plan?year=${year}`, { credentials: "include" });
  if (!res.ok) return { entries: [], hasAnyPlan: false };
  const json = await res.json();
  return {
    entries: (json.entries ?? []) as BudgetPlanEntry[],
    hasAnyPlan: Boolean(json.hasAnyPlan),
  };
}

export async function savePlan(
  entries: BudgetPlanEntry[],
  remove?: Array<{ kind: CategoryKind; category: string; month?: string }>,
): Promise<boolean> {
  const res = await fetch("/api/budget-plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ entries, remove }),
  });
  return res.ok;
}
