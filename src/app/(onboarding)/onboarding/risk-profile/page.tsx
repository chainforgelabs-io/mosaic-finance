"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { ConversationBubble } from "@/components/app/ConversationBubble";
import { useOnboardingStore } from "@/stores/onboarding";
import { useConversationStore } from "@/stores/conversation";
import { saveRiskProfile } from "@/lib/actions/risk-profile";

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

type Phase = "questionnaire" | "conversation" | "review";

interface ConvMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function RiskProfilePage() {
  const router = useRouter();
  const { currentStep, completedSteps, setCurrentStep, completeStep } = useOnboardingStore();

  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conversation phase state
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [convInput, setConvInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [convSessionId, setConvSessionId] = useState<string | null>(null);
  const [riskComplete, setRiskComplete] = useState(false);
  const [riskResult, setRiskResult] = useState<Record<string, unknown> | null>(null);
  const [isPreparingRiskProfile, setIsPreparingRiskProfile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedConv = useRef(false);

  useEffect(() => {
    completeStep("profile");
    completeStep("fact-find");
    setCurrentStep("risk-profile");
  }, [completeStep, setCurrentStep]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convMessages]);

  const averageScore = Object.values(answers).length > 0
    ? Object.values(answers).reduce((a, b) => a + b, 0) / Object.values(answers).length
    : 0;

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (currentQ < RISK_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  };

  const handleQuestionnaireSubmit = async () => {
    setPhase("conversation");

    if (hasStartedConv.current) return;
    hasStartedConv.current = true;

    try {
      const res = await fetch("/api/conversation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionType: "risk-profile" }),
      });
      if (!res.ok) throw new Error("Failed to start session");
      const { sessionId } = await res.json();
      setConvSessionId(sessionId);

      const primeMessage = `The client has completed a structured risk questionnaire. Here are their answers:\n${RISK_QUESTIONS.map((q) => `- ${q.text}: ${q.options.find((o) => o.value === answers[q.id])?.label ?? "Not answered"}`).join("\n")}\n\nQuestionnaire score: ${averageScore.toFixed(1)}/5 (${scoreToPrettyLabel(averageScore)})\n\nPlease now conduct a brief conversational follow-up (3-5 messages) to probe for behavioural biases and contradictions. Use concrete scenarios based on what you know about the client. When done, output the <RISK_PROFILE_COMPLETE> tag.`;

      const msgRes = await fetch("/api/conversation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: primeMessage, sessionType: "risk-profile" }),
      });

      if (!msgRes.ok) throw new Error("Failed to send");

      const reader = msgRes.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      const assistantId = `assistant-${Date.now()}`;
      setConvMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      setIsStreaming(true);

      const timerId = setTimeout(() => setIsPreparingRiskProfile(true), 2500);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") {
                accumulated += data.text;
                setConvMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
                );
              }
              if (data.type === "done" && data.sessionComplete && data.extractedData) {
                setRiskComplete(true);
                setRiskResult(data.extractedData as Record<string, unknown>);
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        clearTimeout(timerId);
        setIsPreparingRiskProfile(false);
      }
      setIsStreaming(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch {
      setIsPreparingRiskProfile(false);
      setConvMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Something went wrong starting the risk conversation. You can still proceed with your questionnaire results." },
      ]);
      setIsStreaming(false);
    }
  };

  const sendConvMessage = async () => {
    if (!convSessionId || !convInput.trim() || isStreaming) return;

    const userMsg = convInput.trim();
    setConvInput("");
    setConvMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: userMsg }]);

    const assistantId = `assistant-${Date.now()}`;
    setConvMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    const preparingTimer = setTimeout(() => setIsPreparingRiskProfile(true), 2500);

    try {
      const res = await fetch("/api/conversation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: convSessionId, message: userMsg, sessionType: "risk-profile" }),
      });

      if (!res.ok) throw new Error("Server error");
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "delta") {
              accumulated += data.text;
              setConvMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
              );
            }
            if (data.type === "done" && data.sessionComplete && data.extractedData) {
              setRiskComplete(true);
              setRiskResult(data.extractedData as Record<string, unknown>);
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      // error
    } finally {
      clearTimeout(preparingTimer);
      setIsPreparingRiskProfile(false);
      setIsStreaming(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    const riskScore = riskResult
      ? (riskResult.risk_score as string) ?? scoreToLabel(averageScore)
      : scoreToLabel(averageScore);

    const conversationalInsights = riskResult
      ? (riskResult.conversational_summary as string) ?? ""
      : "";

    await saveRiskProfile({
      riskScore,
      conversationalInsights,
      questionnaireResponses: {
        answers,
        averageScore,
        questionnaireLabel: scoreToPrettyLabel(averageScore),
        ...(riskResult ?? {}),
      },
    });

    completeStep("risk-profile");
    router.push("/onboarding/holdings");
  };

  const question = RISK_QUESTIONS[currentQ];
  const allAnswered = Object.keys(answers).length === RISK_QUESTIONS.length;
  const progress = (Object.keys(answers).length / RISK_QUESTIONS.length) * 100;

  if (phase === "questionnaire") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[640px]">
          <div className="mb-2 flex justify-center">
            <FinovaLogo size="sm" />
          </div>

          <StepProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            className="mb-8"
          />

          <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8">
            <div className="mb-6 text-center">
              <h1 className="font-display text-[24px] font-bold text-[var(--text-primary)]">
                Risk Tolerance Assessment
              </h1>
              <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
                Understanding your comfort with investment risk helps us build a portfolio you can stick with.
                There are no right or wrong answers.
              </p>
            </div>

            {/* Progress bar */}
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

            {/* Question */}
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

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => currentQ > 0 && setCurrentQ(currentQ - 1)}
                disabled={currentQ === 0}
                className="flex items-center gap-2 font-body text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-30"
              >
                <ArrowLeft className="size-4" />
                Previous
              </button>

              {allAnswered ? (
                <button
                  type="button"
                  onClick={handleQuestionnaireSubmit}
                  className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
                >
                  <MessageCircle className="size-4" />
                  Continue to Follow-Up
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
          </div>
        </div>
      </div>
    );
  }

  // Conversation + Review phase
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--warm-50)]">
      <div className="shrink-0 bg-white">
        <div className="mx-auto max-w-[720px] px-4">
          <div className="flex items-center justify-center py-3">
            <FinovaLogo size="sm" />
          </div>
          <StepProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-6">
          <div className="mb-4 rounded-lg border border-[var(--emerald)]/20 bg-[var(--emerald)]/5 px-4 py-3">
            <p className="font-body text-[13px] text-[var(--text-secondary)]">
              Based on your questionnaire score of <strong>{scoreToPrettyLabel(averageScore)}</strong>,
              our advisor will ask a few follow-up questions to understand how you&apos;d react in real scenarios.
            </p>
          </div>

          <div className="space-y-4">
            {convMessages.map((msg, i) => (
              <ConversationBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && msg.role === "assistant" && i === convMessages.length - 1}
              />
            ))}
          </div>

          {isPreparingRiskProfile && !riskComplete && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--emerald)]/20 bg-[var(--emerald)]/5 px-4 py-3">
              <Loader2 className="size-4 animate-spin text-[var(--emerald)]" />
              <span className="font-body text-[14px] text-[var(--text-secondary)]">
                Preparing your risk profile...
              </span>
            </div>
          )}

          {riskComplete && (
            <div className="mt-6 rounded-lg border border-[var(--emerald)]/30 bg-white p-6">
              <h3 className="mb-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                Your Risk Profile
              </h3>
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-[var(--emerald)] px-4 py-1.5">
                  <span className="font-display text-[14px] font-semibold text-white">
                    {riskResult?.risk_score
                      ? String(riskResult.risk_score).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : scoreToPrettyLabel(averageScore)}
                  </span>
                </div>
              </div>
              {typeof riskResult?.conversational_summary === "string" && (
                <p className="mb-4 font-body text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  {riskResult.conversational_summary}
                </p>
              )}
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    Confirm & Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {!riskComplete && (
        <div className="shrink-0 border-t border-[var(--warm-200)] bg-white">
          <div className="mx-auto flex max-w-[720px] items-end gap-3 px-4 py-4">
            <textarea
              ref={textareaRef}
              autoFocus
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendConvMessage();
                }
              }}
              placeholder="Type your response..."
              disabled={isStreaming || !convSessionId}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-[var(--warm-200)] bg-white px-4 py-2.5 font-body text-[15px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={sendConvMessage}
              disabled={isStreaming || !convInput.trim() || !convSessionId}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)] text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-40"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {riskComplete && !isSubmitting && (
        <div className="shrink-0 border-t border-[var(--warm-200)] bg-white">
          <div className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setPhase("questionnaire");
                hasStartedConv.current = false;
                setConvMessages([]);
                setConvSessionId(null);
                setRiskComplete(false);
                setRiskResult(null);
              }}
              className="flex items-center gap-2 font-body text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="size-4" />
              Retake Questionnaire
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white hover:bg-[var(--emerald-dark)] disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Continue to Holdings"}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
