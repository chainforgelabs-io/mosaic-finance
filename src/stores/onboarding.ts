import { create } from "zustand";
import type { OnboardingStep } from "@/components/app/StepProgress";

export interface FactFindAccount {
  account_type: string;
  approximate_balance: number;
  description: string;
}

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  complianceAcknowledged: boolean;
  factFindAccounts: FactFindAccount[];
  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  setComplianceAcknowledged: (acknowledged: boolean) => void;
  setFactFindAccounts: (accounts: FactFindAccount[]) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: "profile",
  completedSteps: [],
  complianceAcknowledged: false,
  factFindAccounts: [],

  setCurrentStep: (step) => set({ currentStep: step }),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  setComplianceAcknowledged: (acknowledged) =>
    set({ complianceAcknowledged: acknowledged }),

  setFactFindAccounts: (accounts) => set({ factFindAccounts: accounts }),

  reset: () =>
    set({
      currentStep: "profile",
      completedSteps: [],
      complianceAcknowledged: false,
      factFindAccounts: [],
    }),
}));
