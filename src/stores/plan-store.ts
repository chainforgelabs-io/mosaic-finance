"use client";

import { create } from "zustand";
import type { FinancialPlan, PlanStatus, UserProfile, MarketContextReport } from "@/types";

export interface PrePlanData {
  annualIncome: number | null;
  monthlyExpenses: number | null;
  emergencyFundMonths: number | null;
  totalInvestments: number | null;
  /** Real estate, vehicles, etc. — included in pre-plan total assets & net worth */
  totalFixedAssets: number | null;
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
  setLoading: (isLoading: boolean) => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  user: null,
  plan: null,
  planStatus: "none",
  rawPlanData: null,
  marketContext: null,
  prePlanData: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, plan: null, planStatus: "none", rawPlanData: null, prePlanData: null }),
  setPlan: (plan) => set({ plan, planStatus: plan.status }),
  setPlanStatus: (planStatus) => set({ planStatus }),
  setRawPlanData: (data) => set({ rawPlanData: data }),
  setMarketContext: (marketContext) => set({ marketContext }),
  setPrePlanData: (prePlanData) => set({ prePlanData }),
  setLoading: (isLoading) => set({ isLoading }),
}));
