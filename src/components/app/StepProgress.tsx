"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type OnboardingStep =
  | "profile"
  | "fact-find"
  | "goals"
  | "risk-profile"
  | "holdings"
  | "generating"
  | "review"
  | "complete";

const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "fact-find", label: "Consultation" },
  { key: "goals", label: "Goals" },
  { key: "risk-profile", label: "Risk Profile" },
  { key: "holdings", label: "Holdings" },
  { key: "generating", label: "Generating" },
  { key: "review", label: "Review" },
  { key: "complete", label: "Complete" },
];

interface StepProgressProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  className?: string;
}

export function StepProgress({
  currentStep,
  completedSteps,
  className,
}: StepProgressProps) {
  return (
    <div className={cn("w-full overflow-x-auto border-b border-[var(--warm-200)] px-4 py-6", className)}>
      <div className="flex items-center justify-between gap-1 sm:gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-colors sm:size-7",
                    isCompleted && "bg-[var(--emerald)]",
                    isCurrent && !isCompleted && "bg-[var(--emerald)]",
                    !isCurrent && !isCompleted && "border-2 border-[var(--warm-200)] bg-transparent",
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3 text-white sm:size-3.5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="block size-1.5 rounded-full bg-white sm:size-2" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap font-body text-[9px] sm:text-[11px]",
                    isCurrent || isCompleted
                      ? "font-medium text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1.5 h-[2px] flex-1 rounded-full sm:mx-2",
                    isCompleted ? "bg-[var(--emerald)]" : "bg-[var(--warm-200)]",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
