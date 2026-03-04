import { create } from "zustand";
import type { OnboardingStep } from "@/components/app/StepProgress";

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: "profile",
  completedSteps: [],

  setCurrentStep: (step) => set({ currentStep: step }),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  reset: () => set({ currentStep: "profile", completedSteps: [] }),
}));
