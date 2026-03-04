import { create } from "zustand";

type OnboardingStep =
  | "profile"
  | "fact-find"
  | "holdings"
  | "risk-profile"
  | "generating"
  | "pending-review"
  | "complete";

interface OnboardingStore {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  planId: string | null;
  setStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  setPlanId: (id: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  currentStep: "profile",
  completedSteps: [],
  planId: null,
  setStep: (step) => set({ currentStep: step }),
  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),
  setPlanId: (id) => set({ planId: id }),
  reset: () =>
    set({ currentStep: "profile", completedSteps: [], planId: null }),
}));
