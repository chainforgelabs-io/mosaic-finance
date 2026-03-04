"use client";

import { create } from "zustand";
import type {
  ApprovalQueueItem,
  ReviewerProfile,
  QueueFilter,
  ApprovalAction,
} from "@/types";
import { mockQueueItems, mockReviewer } from "@/lib/admin-mock-data";

interface AdminStore {
  reviewer: ReviewerProfile | null;
  queueItems: ApprovalQueueItem[];
  filter: QueueFilter;
  isLoading: boolean;

  loadAdminData: () => void;
  setFilter: (filter: QueueFilter) => void;
  getFilteredItems: () => ApprovalQueueItem[];
  getQueueStats: () => { pending: number; dueToday: number; overdue: number; completedToday: number };
  getItemById: (id: string) => ApprovalQueueItem | undefined;
  processAction: (itemId: string, action: ApprovalAction, notes?: string, reason?: string) => void;
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

export const useAdminStore = create<AdminStore>((set, get) => ({
  reviewer: null,
  queueItems: [],
  filter: "all",
  isLoading: false,

  loadAdminData: () => {
    set({ reviewer: mockReviewer, queueItems: mockQueueItems, isLoading: false });
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
    const { queueItems } = get();
    return {
      pending: queueItems.length,
      dueToday: queueItems.filter((item) => isDueToday(item.slaDeadline)).length,
      overdue: queueItems.filter((item) => isOverdue(item.slaDeadline)).length,
      completedToday: 3,
    };
  },

  getItemById: (id) => {
    return get().queueItems.find((item) => item.id === id);
  },

  processAction: (itemId, action, notes, reason) => {
    set((state) => ({
      queueItems: state.queueItems.filter((item) => item.id !== itemId),
    }));
    console.log(`[Admin] Action: ${action} on ${itemId}`, { notes, reason });
  },
}));
