"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { MosaicLogo } from "@/components/app/MosaicLogo";
import { useOnboardingStore } from "@/stores/onboarding";
import { getRiskProfileStatus, saveRiskProfile } from "@/lib/actions/risk-profile";

interface QuestionOption {
  value: number;
  label: string;
}

interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

const RISK_QUESTIONS: Question[] = [
  {
    id: "objective",
    text: "What is your primary investment objective?",
    options: [
      { value: 1, label: "Preserve my capital — I cannot afford any losses" },
      { value: 2, label: "Generate steady income with minimal fluctuation" },
      { value: 3, label: "Balance between growth and income" },
      { value: 4, label: "Grow my portfolio — I can accept some ups and downs" },
      { value: 5, label: "Maximize long-term growth — I can handle significant volatility" },
    ],
  },
  {
    id: "time_horizon",
    text: "When will you need to access the majority of your invested funds?",
    options: [
      { value: 1, label: "Within 1–2 years" },
      { value: 2, label: "3–5 years" },
      { value: 3, label: "6–10 years" },
      { value: 4, label: "11–20 years" },
      { value: 5, label: "20+ years" },
    ],
  },
  {
    id: "loss_reaction",
    text: "If your portfolio dropped 20% in a single month, what would you do?",
    options: [
      { value: 1, label: "Sell everything immediately to prevent further losses" },
      { value: 2, label: "Sell some holdings to reduce exposure" },
      { value: 3, label: "Do nothing — wait for recovery" },
      { value: 4, label: "See it as a buying opportunity and invest more" },
    ],
  },
  {
    id: "guaranteed_vs_variable",
    text: "Which would you prefer?",
    options: [
      { value: 1, label: "A guaranteed return of 3% per year" },
      { value: 2, label: "A probable return of 6% with a chance of losing 2%" },
      { value: 3, label: "A probable return of 10% with a chance of losing 10%" },
      { value: 4, label: "A probable return of 15% with a chance of losing 20%" },
    ],
  },
  {
    id: "experience",
    text: "How would you describe your investment experience?",
    options: [
      { value: 1, label: "None — I've only used savings accounts and GICs" },
      { value: 2, label: "Limited — I have some mutual funds or a balanced portfolio" },
      { value: 3, label: "Moderate — I actively manage a diversified portfolio" },
      { value: 4, label: "Extensive — I trade individual stocks, ETFs, and understand options" },
    ],
  },
  {
    id: "portfolio_check",
    text: "How often would you check your investment portfolio?",
    options: [
      { value: 1, label: "Daily — I want to know every movement" },
      { value: 2, label: "Weekly" },
      { value: 3, label: "Monthly or quarterly" },
      { value: 4, label: "Annually — I trust the long-term strategy" },
    ],
  },
  {
    id: "income_stability",
    text: "How stable is your household income?",
    options: [
      { value: 1, label: "Very unstable — freelance, seasonal, or uncertain" },
      { value: 2, label: "Somewhat stable — variable bonuses or commissions" },
      { value: 3, label: "Stable — salaried with good job security" },
      { value: 4, label: "Very stable — government, tenured, or multiple income sources" },
    ],
  },
  {
    id: "negative_balance",
    text: "How comfortable are you seeing a negative balance (unrealized loss) in your investment accounts?",
    options: [
      { value: 1, label: "Very uncomfortable — it would cause me significant stress" },
      { value: 2, label: "Somewhat uncomfortable — I'd worry but hold" },
      { value: 3, label: "Neutral — I understand it's part of investing" },
      { value: 4, label: "Comfortable — short-term losses don't bother me at all" },
    ],
  },
];

const FOLLOW_UP_QUESTIONS: Question[] = [
  {
    id: "household",
    text: "If a market drop stressed someone in your household, what would you do?",
    options: [
      { value: 1, label: "Change the plan so they feel more at ease" },
      { value: 3, label: "Talk it through, then decide" },
      { value: 5, label: "Stick with the plan" },
    ],
  },
  {
    id: "lagging_fund",
    text: "A fund you own is down, and one you passed on is up. What feels right?",
    options: [
      { value: 1, label: "Sell and move to the one that's up" },
      { value: 3, label: "Hold and review it later" },
      { value: 5, label: "It doesn't bother me much" },
    ],
  },
];

function scoreToLabel(score: number): string {
  if (score <= 1.5) return "conservative";
  if (score <= 2.2) return "moderate-conservative";
  if (score <= 3.0) return "balanced";
  if (score <= 3.7) return "moderate-growth";
  if (score <= 4.3) return "growth";
  return "aggressive";
}

function scoreToPrettyLabel(score: number): string {
  if (score <= 1.5) return "Conservative";
  if (score <= 2.2) return "Moderately Conservative";
  if (score <= 3.0) return "Balanced";
  if (score <= 3.7) return "Moderate Growth";
  if (score <= 4.3) return "Growth";
  return "Aggressive";
}

function answerLabel(question: Question, answers: Record<string, number>): string {
  return question.options.find((option) => option.value === answers[question.id])?.label ?? "";
}

type Phase = "questionnaire" | "followup" | "review";

export default function RiskProfilePage() {
  const router = useRouter();
  const { currentStep, completedSteps, setCurrentStep, completeStep } = useOnboardingStore();

  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkingExistingProfile, setCheckingExistingProfile] = useState(true);

  useEffect(() => {
    completeStep("profile");
    completeStep("fact-find");
    completeStep("goals");
    setCurrentStep("risk-profile");
  }, [completeStep, setCurrentStep]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { completed } = await getRiskProfileStatus();
      if (cancelled) return;
      if (completed) {
        completeStep("risk-profile");
        router.replace("/onboarding/holdings");
        return;
      }
      setCheckingExistingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [completeStep, router]);

  const scoredAnswers = RISK_QUESTIONS.map((item) => answers[item.id]).filter(
    (value): value is number => value != null,
  );
  const averageScore =
    scoredAnswers.length > 0
      ? scoredAnswers.reduce((sum, value) => sum + value, 0) / scoredAnswers.length
      : 0;

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (currentQ < RISK_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSaveError(null);

    const riskScore = scoreToLabel(averageScore);
    const conversationalInsights = FOLLOW_UP_QUESTIONS
      .map((question) => `${question.text} ${answerLabel(question, answers)}`)
      .join(" ");

    const result = await saveRiskProfile({
      riskScore,
      conversationalInsights,
      questionnaireResponses: {
        answers,
        averageScore,
        questionnaireLabel: scoreToPrettyLabel(averageScore),
      },
    });

    if (result.error) {
      setSaveError(result.error);
      setIsSubmitting(false);
      return;
    }

    completeStep("risk-profile");
    router.push("/onboarding/holdings");
  };

  const question = RISK_QUESTIONS[currentQ];
  const allAnswered = RISK_QUESTIONS.every((item) => answers[item.id] != null);
  const followUpAnswered = FOLLOW_UP_QUESTIONS.every((item) => answers[item.id] != null);
  const progress = (RISK_QUESTIONS.filter((item) => answers[item.id] != null).length / RISK_QUESTIONS.length) * 100;
  const profileLabel = scoreToPrettyLabel(averageScore);

  if (checkingExistingProfile) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-[var(--emerald)]" />
          <p className="font-body text-sm text-[var(--text-muted)]">Loading your progress…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[640px]">
        <div className="mb-2 flex justify-center">
          <MosaicLogo size="sm" />
        </div>

        <StepProgress currentStep={currentStep} completedSteps={completedSteps} className="mb-8" />

        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-4 sm:p-6 md:p-8">
          {phase === "questionnaire" ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-xl font-bold text-[var(--text-primary)] sm:text-[24px]">
                  Risk Tolerance Assessment
                </h1>
                <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
                  We use this only to model a portfolio for projections. The model uses a growth rate
                  that matches your risk tolerance, so you can see how that path might look over time.
                  It is not a recommendation to buy or sell anything. There are no right or wrong answers.
                </p>
              </div>

              <div className="mb-6">
                <div className="mb-1.5 flex justify-between">
                  <span className="font-body text-[12px] text-[var(--text-muted)]">
                    Question {currentQ + 1} of {RISK_QUESTIONS.length}
                  </span>
                  <span className="font-body text-[12px] text-[var(--text-muted)]">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--warm-200)]">
                  <div
                    className="h-1.5 rounded-full bg-[var(--emerald)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h2 className="mb-4 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                  {question.text}
                </h2>
                <div className="space-y-3">
                  {question.options.map((option) => {
                    const isSelected = answers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleAnswer(question.id, option.value)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-5 py-4 text-left transition-all",
                          isSelected
                            ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/20"
                            : "border-[var(--warm-200)] bg-white hover:bg-[var(--warm-100)]",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected
                              ? "border-[var(--emerald)] bg-[var(--emerald)]"
                              : "border-[var(--warm-200)]",
                          )}
                        >
                          {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="font-body text-[14px] text-[var(--text-primary)]">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => currentQ > 0 && setCurrentQ(currentQ - 1)}
                  disabled={currentQ === 0}
                  className="flex items-center gap-2 font-body text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-30"
                >
                  <ArrowLeft className="size-4" />
                  Previous
                </button>

                {allAnswered && currentQ === RISK_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setPhase("followup")}
                    className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
                  >
                    Continue
                    <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => currentQ < RISK_QUESTIONS.length - 1 && setCurrentQ(currentQ + 1)}
                    disabled={!answers[question.id]}
                    className="flex items-center gap-2 font-body text-[14px] font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)] disabled:opacity-30"
                  >
                    Next
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </>
          ) : phase === "followup" ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-xl font-bold text-[var(--text-primary)] sm:text-[24px]">
                  Two quick scenarios
                </h1>
                <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
                  Pick the closest answer. This stays short on purpose.
                </p>
              </div>

              <div className="mb-6 space-y-6">
                {FOLLOW_UP_QUESTIONS.map((item) => (
                  <div key={item.id}>
                    <h2 className="mb-3 font-display text-[16px] font-semibold text-[var(--text-primary)]">
                      {item.text}
                    </h2>
                    <div className="space-y-3">
                      {item.options.map((option) => {
                        const isSelected = answers[item.id] === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: option.value }))}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border px-5 py-4 text-left transition-all",
                              isSelected
                                ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/20"
                                : "border-[var(--warm-200)] bg-white hover:bg-[var(--warm-100)]",
                            )}
                          >
                            <div
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                isSelected
                                  ? "border-[var(--emerald)] bg-[var(--emerald)]"
                                  : "border-[var(--warm-200)]",
                              )}
                            >
                              {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className="font-body text-[14px] text-[var(--text-primary)]">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPhase("questionnaire")}
                  className="flex items-center gap-2 font-body text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="size-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("review")}
                  disabled={!followUpAnswered}
                  className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-30"
                >
                  See your profile
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-xl font-bold text-[var(--text-primary)] sm:text-[24px]">
                  Your risk profile
                </h1>
                <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
                  We&apos;ll use this to choose a growth rate for projections. Any portfolio we show is
                  a model of that rate over time, for education only.
                </p>
              </div>

              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-[var(--emerald)] px-4 py-1.5">
                  <span className="font-display text-[14px] font-semibold text-white">{profileLabel}</span>
                </div>
              </div>

              {saveError && (
                <p className="mb-4 text-center font-body text-sm text-[var(--error)]">{saveError}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPhase("followup")}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 font-body text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-30"
                >
                  <ArrowLeft className="size-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Continue"}
                  {!isSubmitting && <ArrowRight className="size-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
