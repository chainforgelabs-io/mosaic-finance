"use client";

import { create } from "zustand";
import type {
  ApprovalQueueItem,
  ReviewerProfile,
  QueueFilter,
  ApprovalAction,
  Tier,
} from "@/types";
import { transformDbPlanToFinancialPlan } from "@/lib/plan/transform-db-plan";
import { PROVINCE_CODE_TO_NAME } from "@/lib/config/profile-mappings";
import { mapRiskScoreToLabel, mapRiskScoreToNumber } from "@/lib/risk/map-risk-score";
import { createClient } from "@/lib/supabase/client";

interface QueueSummary {
  total: number;
  pending: number;
  overdue: number;
  dueToday: number;
  approved: number;
  rejected: number;
  completedToday: number;
}

interface AdminStore {
  reviewer: ReviewerProfile | null;
  queueItems: ApprovalQueueItem[];
  filter: QueueFilter;
  isLoading: boolean;
  loadError: string | null;
  queueSummary: QueueSummary | null;

  loadAdminData: () => Promise<void>;
  setFilter: (filter: QueueFilter) => void;
  getFilteredItems: () => ApprovalQueueItem[];
  getQueueStats: () => {
    pending: number;
    dueToday: number;
    overdue: number;
    completedToday: number;
  };
  getItemById: (id: string) => ApprovalQueueItem | undefined;
  processAction: (
    itemId: string,
    action: ApprovalAction,
    notes?: string,
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

function isOverdue(slaDeadline: string): boolean {
  return new Date(slaDeadline) < new Date();
}

function isDueToday(slaDeadline: string): boolean {
  const deadline = new Date(slaDeadline);
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return deadline <= endOfDay && deadline >= now;
}

type ApiQueueRow = {
  id: string;
  plan_id: string;
  user_id: string;
  status: string;
  priority: string;
  submitted_at: string;
  sla_deadline: string | null;
  financial_plans: {
    id: string;
    plan_data: unknown;
    version: number;
    status: string;
    created_at: string;
  } | null;
  user_profiles: {
    alias: string | null;
    province: string | null;
    age: number | null;
    subscription_tier: string | null;
  } | null;
  risk_profile: { risk_score: string } | null;
};

function mapRowToItem(row: ApiQueueRow): ApprovalQueueItem | null {
  const fp = row.financial_plans;
  if (!fp || !row.sla_deadline) return null;

  const rawScore = row.risk_profile?.risk_score;
  const riskLabel = mapRiskScoreToLabel(rawScore);
  const riskScore = mapRiskScoreToNumber(rawScore);
  const provinceCode = row.user_profiles?.province ?? "";
  const province =
    PROVINCE_CODE_TO_NAME[provinceCode] ?? provinceCode ?? "—";
  const tier = (row.user_profiles?.subscription_tier ?? "snapshot") as Tier;

  const plan = transformDbPlanToFinancialPlan(
    {
      id: fp.id,
      status: fp.status,
      plan_data: fp.plan_data,
      created_at: fp.created_at,
    },
    {
      userId: row.user_id,
      riskLabel,
    },
  );

  return {
    id: row.id,
    planId: row.plan_id,
    userAlias: row.user_profiles?.alias ?? "—",
    riskScore,
    riskLabel,
    tier,
    province,
    age: row.user_profiles?.age ?? 0,
    submittedAt: row.submitted_at,
    slaDeadline: row.sla_deadline,
    priority: (row.priority === "priority" ? "priority" : "standard") as
      | "priority"
      | "standard",
    plan,
  };
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  reviewer: null,
  queueItems: [],
  filter: "all",
  isLoading: false,
  loadError: null,
  queueSummary: null,

  loadAdminData: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ reviewer: null, queueItems: [], isLoading: false, loadError: "Not signed in" });
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("alias, role")
        .eq("id", user.id)
        .single();

      const reviewer: ReviewerProfile = {
        id: user.id,
        name: profile?.alias ?? user.email ?? "Advisor",
        email: user.email ?? "",
        role: profile?.role === "admin" ? "admin" : "user",
      };

      const res = await fetch("/api/approval/queue", { credentials: "include" });
      if (!res.ok) {
        const err = res.status === 403 ? "Forbidden" : "Failed to load queue";
        set({ reviewer, queueItems: [], isLoading: false, loadError: err, queueSummary: null });
        return;
      }

      const body = (await res.json()) as {
        queue: ApiQueueRow[];
        summary: QueueSummary;
      };

      const items: ApprovalQueueItem[] = [];
      for (const row of body.queue ?? []) {
        const mapped = mapRowToItem(row);
        if (mapped) items.push(mapped);
      }

      set({
        reviewer,
        queueItems: items,
        queueSummary: body.summary ?? null,
        isLoading: false,
        loadError: null,
      });
    } catch (e) {
      set({
        isLoading: false,
        loadError: e instanceof Error ? e.message : "Load failed",
      });
    }
  },

  setFilter: (filter) => set({ filter }),

  getFilteredItems: () => {
    const { queueItems, filter } = get();
    switch (filter) {
      case "priority":
        return queueItems.filter((item) => item.priority === "priority");
      case "standard":
        return queueItems.filter((item) => item.priority === "standard");
      case "overdue":
        return queueItems.filter((item) => isOverdue(item.slaDeadline));
      default:
        return queueItems;
    }
  },

  getQueueStats: () => {
    const { queueItems, queueSummary } = get();
    if (queueSummary) {
      return {
        pending: queueSummary.pending,
        dueToday: queueSummary.dueToday,
        overdue: queueSummary.overdue,
        completedToday: queueSummary.completedToday,
      };
    }
    return {
      pending: queueItems.length,
      dueToday: queueItems.filter((item) => isDueToday(item.slaDeadline)).length,
      overdue: queueItems.filter((item) => isOverdue(item.slaDeadline)).length,
      completedToday: 0,
    };
  },

  getItemById: (id) => {
    return get().queueItems.find((item) => item.id === id);
  },

  processAction: async (itemId, action, notes, reason) => {
    const apiAction = action === "edit_approve" ? "edit" : action;
    const payload =
      action === "reject"
        ? { action: apiAction, notes: reason || notes }
        : { action: apiAction, notes };

    try {
      const res = await fetch(`/api/approval/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (data as { error?: string }).error ?? res.statusText,
        };
      }

      set((state) => ({
        queueItems: state.queueItems.filter((item) => item.id !== itemId),
        queueSummary: state.queueSummary
          ? {
              ...state.queueSummary,
              total: Math.max(0, state.queueSummary.total - 1),
              pending: Math.max(0, state.queueSummary.pending - 1),
            }
          : state.queueSummary,
      }));

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Request failed",
      };
    }
  },
}));
