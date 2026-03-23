"use client";

import { create } from "zustand";
import type { FinancialPlan, PlanStatus, UserProfile, MarketContextReport } from "@/types";
import { mockDeliveredPlan, mockUser, mockMarketContext } from "@/lib/mock-data";

export interface PrePlanData {
  annualIncome: number | null;
  monthlyExpenses: number | null;
  emergencyFundMonths: number | null;
  totalInvestments: number | null;
  totalDebt: number | null;
  retirementAge: number | null;
}

interface PlanStore {
  user: UserProfile | null;
  plan: FinancialPlan | null;
  planStatus: PlanStatus;
  rawPlanData: Record<string, unknown> | null;
  marketContext: MarketContextReport | null;
  prePlanData: PrePlanData | null;
  isLoading: boolean;

  setUser: (user: UserProfile) => void;
  clearUser: () => void;
  setPlan: (plan: FinancialPlan) => void;
  setPlanStatus: (status: PlanStatus) => void;
  setRawPlanData: (data: Record<string, unknown>) => void;
  setMarketContext: (report: MarketContextReport) => void;
  setPrePlanData: (data: PrePlanData) => void;
  loadMockData: (scenario: "none" | "pending" | "delivered") => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  user: null,
  plan: null,
  planStatus: "none",
  rawPlanData: null,
  marketContext: null,
  prePlanData: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, plan: null, planStatus: "none", rawPlanData: null, prePlanData: null }),
  setPlan: (plan) => set({ plan, planStatus: plan.status }),
  setPlanStatus: (planStatus) => set({ planStatus }),
  setRawPlanData: (data) => set({ rawPlanData: data }),
  setMarketContext: (marketContext) => set({ marketContext }),
  setPrePlanData: (prePlanData) => set({ prePlanData }),

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
