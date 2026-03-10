"use client";

import { create } from "zustand";
import type { FinancialPlan, PlanStatus, UserProfile, MarketContextReport } from "@/types";
import { mockDeliveredPlan, mockUser, mockMarketContext } from "@/lib/mock-data";

interface PlanStore {
  user: UserProfile | null;
  plan: FinancialPlan | null;
  planStatus: PlanStatus;
  marketContext: MarketContextReport | null;
  isLoading: boolean;

  setUser: (user: UserProfile) => void;
  clearUser: () => void;
  setPlan: (plan: FinancialPlan) => void;
  setPlanStatus: (status: PlanStatus) => void;
  setMarketContext: (report: MarketContextReport) => void;
  loadMockData: (scenario: "none" | "pending" | "delivered") => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  user: null,
  plan: null,
  planStatus: "none",
  marketContext: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, plan: null, planStatus: "none" }),
  setPlan: (plan) => set({ plan, planStatus: plan.status }),
  setPlanStatus: (planStatus) => set({ planStatus }),
  setMarketContext: (marketContext) => set({ marketContext }),

  loadMockData: (scenario) => {
    set({ user: mockUser, isLoading: false });
    switch (scenario) {
      case "none":
        set({ plan: null, planStatus: "none", marketContext: null });
        break;
      case "pending":
        set({
          plan: { ...mockDeliveredPlan, status: "pending_review", deliveredAt: undefined, estimatedDelivery: "Within 24 hours", sections: [], healthScore: 0 },
          planStatus: "pending_review",
          marketContext: mockMarketContext,
        });
        break;
      case "delivered":
        set({
          plan: mockDeliveredPlan,
          planStatus: "delivered",
          marketContext: mockMarketContext,
        });
        break;
    }
  },
}));
