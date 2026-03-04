import { create } from "zustand";
import type { OnboardingStep } from "@/components/app/StepProgress";

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  complianceAcknowledged: boolean;
  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  setComplianceAcknowledged: (acknowledged: boolean) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: "profile",
  completedSteps: [],
  complianceAcknowledged: false,

  setCurrentStep: (step) => set({ currentStep: step }),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  setComplianceAcknowledged: (acknowledged) =>
    set({ complianceAcknowledged: acknowledged }),

  reset: () =>
    set({
      currentStep: "profile",
      completedSteps: [],
      complianceAcknowledged: false,
    }),
}));
