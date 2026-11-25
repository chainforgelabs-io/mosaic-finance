"use client";

import { getJson, invalidateApi } from "@/lib/client/api-cache";
import type { BudgetPlanEntry, BudgetPlanSchedule } from "@/types/tracking";
import {
  categoryKind,
  categoryLabel,
  defaultCategoriesForKind,
  type CategoryKind,
  type UserCategory,
} from "@/lib/tracking/categories";

/** Custom (non-built-in) slugs from the catalog, for keypad extras. */
export function extraSlugs(catalog: UserCategory[], kind: CategoryKind = "expense"): string[] {
  const builtins = new Set(defaultCategoriesForKind(kind));
  return catalog
    .filter((row) => row.kind === kind && !row.archived && !builtins.has(row.slug))
    .map((row) => row.slug);
}

/** Persist a keypad-created category to the catalog so it shows on every device. */
export async function persistCustomCategory(
  slug: string,
  kind: CategoryKind = "expense",
): Promise<UserCategory | null> {
  return saveCategory({ slug, label: categoryLabel(slug), kind });
}

export const CUSTOM_CATEGORY_KEY = "mosaic-custom-categories";
const CUSTOM_MIGRATED_KEY = "mosaic-custom-categories-synced";

export async function fetchCatalog(): Promise<UserCategory[]> {
  const result = await getJson<{ categories?: UserCategory[] }>("/api/categories");
  if (!result.ok || !result.body) return [];
  return result.body.categories ?? [];
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
  invalidateApi("/api/categories");
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
  invalidateApi("/api/categories");
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

export async function fetchPlan(year: number): Promise<{
  entries: BudgetPlanEntry[];
  hasAnyPlan: boolean;
  schedules: BudgetPlanSchedule[];
}> {
  const result = await getJson<{
    entries?: BudgetPlanEntry[];
    hasAnyPlan?: boolean;
    schedules?: BudgetPlanSchedule[];
  }>(`/api/budget-plan?year=${year}`);
  if (!result.ok || !result.body) return { entries: [], hasAnyPlan: false, schedules: [] };
  return {
    entries: result.body.entries ?? [],
    hasAnyPlan: Boolean(result.body.hasAnyPlan),
    schedules: result.body.schedules ?? [],
  };
}

export async function savePlan(
  entries: BudgetPlanEntry[],
  remove?: Array<{ kind: CategoryKind; category: string; month?: string }>,
  schedules?: BudgetPlanSchedule[],
): Promise<{ ok: boolean; schedulesSaved: boolean }> {
  const res = await fetch("/api/budget-plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ entries, remove, schedules }),
  });
  if (!res.ok) return { ok: false, schedulesSaved: false };
  invalidateApi("/api/budget-plan");
  const json = await res.json().catch(() => ({}));
  return { ok: true, schedulesSaved: json.schedulesSaved !== false };
}
