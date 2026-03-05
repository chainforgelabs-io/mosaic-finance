"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowRight,
  Check,
  Shield,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { ConversationBubble } from "@/components/app/ConversationBubble";
import { ConversationErrorBoundary } from "@/components/app/ConversationErrorBoundary";
import { useOnboardingStore } from "@/stores/onboarding";
import { saveRiskProfile } from "@/lib/actions/risk-profile";
import {
  RISK_QUESTIONS,
  RISK_LABELS,
  computeRiskScore,
  type RiskLabel,
} from "@/lib/schemas/risk-profile";
import type { Message } from "@/stores/conversation";

type Phase = "questionnaire" | "conversation" | "reveal";

function QuestionnairePhase({
  onComplete,
}: {
  onComplete: (answers: Record<string, number>) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const totalQuestions = RISK_QUESTIONS.length;
  const question = RISK_QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleNext = () => {
    if (selectedValue === null) return;

    const newAnswers = { ...answers, [question.id]: selectedValue };
    setAnswers(newAnswers);
    setSelectedValue(null);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(newAnswers);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="mb-8 text-center">
        <h1 className="font-display text-[26px] font-bold text-[var(--text-primary)]">
          Understanding Your Risk Profile
        </h1>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-body text-[13px] text-[var(--text-muted)]">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="font-body text-[13px] font-medium text-[var(--emerald)]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--warm-200)]">
          <div
            className="h-full rounded-full bg-[var(--emerald)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8">
        <h2 className="mb-6 font-display text-[20px] font-medium text-[var(--text-primary)]">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = selectedValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedValue(option.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-5 py-4 text-left transition-all",
                  isSelected
                    ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/30"
                    : "border-[var(--warm-200)] bg-white hover:bg-[var(--warm-100)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? "border-[var(--emerald)] bg-[var(--emerald)]"
                      : "border-[var(--warm-200)]",
                  )}
                >
                  {isSelected && (
                    <Check className="size-3 text-white" strokeWidth={3} />
                  )}
                </span>
                <span
                  className={cn(
                    "font-body text-[15px]",
                    isSelected
                      ? "font-medium text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]",
                  )}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={selectedValue === null}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentIndex < totalQuestions - 1 ? "Next" : "Continue"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function ConversationPhase({
  onComplete,
}: {
  onComplete: (insight: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [conversationComplete, setConversationComplete] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorBoundaryRef = useRef<ConversationErrorBoundary>(null);
  const hasStarted = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (userMessage?: string) => {
      if (!sessionId) return;

      if (userMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: "user",
            content: userMessage,
          },
        ]);
      }

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setIsStreaming(true);
      setError(null);

      errorBoundaryRef.current?.resetTimeout();

      try {
        const res = await fetch("/api/conversation/risk-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: userMessage }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                switch (eventType) {
                  case "token":
                    accumulated += data.content;
                    setMessages((prev) => {
                      const msgs = [...prev];
                      const lastIdx = msgs.findLastIndex(
                        (m) => m.role === "assistant",
                      );
                      if (lastIdx !== -1) {
                        msgs[lastIdx] = { ...msgs[lastIdx], content: accumulated };
                      }
                      return msgs;
                    });
                    break;

                  case "done":
                    if (data.sessionComplete) {
                      setConversationComplete(true);
                      if (data.insight) setInsight(data.insight);
                    }
                    break;

                  case "error":
                    setError(data.message ?? "An error occurred");
                    break;
                }
              } catch {
                // SSE parse error — skip
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Connection failed. Please retry.",
        );
      } finally {
        setIsStreaming(false);
        errorBoundaryRef.current?.clearTimeout();
      }
    },
    [sessionId],
  );

  const startConversation = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    try {
      const res = await fetch("/api/conversation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionType: "risk-profile" }),
      });
      if (!res.ok) throw new Error("Failed to start session");

      const { sessionId: newSessionId } = await res.json();
      setSessionId(newSessionId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation",
      );
      hasStarted.current = false;
    }
  }, []);

  useEffect(() => {
    startConversation();
  }, [startConversation]);

  useEffect(() => {
    if (sessionId && messages.length === 0 && !isStreaming) {
      sendMessage();
    }
  }, [sessionId, messages.length, isStreaming, sendMessage]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleRetry = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setConversationComplete(false);
    setInsight(null);
    hasStarted.current = false;
    startConversation();
  };

  return (
    <ConversationErrorBoundary ref={errorBoundaryRef} onRetry={handleRetry}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mb-4 text-center">
          <p className="font-body text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Risk Profile — Behavioral Assessment
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-4 py-6">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <ConversationBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={
                    isStreaming &&
                    msg.role === "assistant" &&
                    i === messages.length - 1
                  }
                />
              ))}
            </div>

            {error && (
              <div className="mt-4 flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
                  <p className="font-body text-[14px] text-[var(--error)]">
                    Something went wrong. Please try again.
                  </p>
                  <button
                    onClick={() => sendMessage()}
                    className="mt-2 font-body text-[13px] font-medium text-[var(--emerald)] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {conversationComplete && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => onComplete(insight ?? "")}
                  className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-8 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
                >
                  See My Risk Profile
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {!conversationComplete && (
          <div className="shrink-0 border-t border-[var(--warm-200)] bg-white">
            <div className="mx-auto flex max-w-[720px] items-end gap-3 px-4 py-4">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                disabled={isStreaming || !sessionId}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--warm-200)] bg-white px-4 py-2.5 font-body text-[15px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !inputValue.trim() || !sessionId}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--slate-950)] transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                <ArrowUp className="size-5 text-[var(--emerald)]" />
              </button>
            </div>
            <p className="px-4 pb-3 text-center font-body text-[11px] text-[var(--text-muted)]">
              Your responses are encrypted and never shared.
            </p>
          </div>
        )}
      </div>
    </ConversationErrorBoundary>
  );
}

function SpectrumBar({
  segmentIndex,
  animated,
}: {
  segmentIndex: number;
  animated: boolean;
}) {
  return (
    <div className="flex gap-1">
      {RISK_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className={cn(
              "h-3 w-full rounded-full transition-all duration-1000",
              i === segmentIndex && animated
                ? "bg-[var(--emerald)] shadow-[0_0_12px_var(--emerald)]"
                : i === segmentIndex
                  ? "bg-[var(--emerald)]"
                  : "bg-[var(--warm-200)]",
            )}
            style={
              animated && i === segmentIndex
                ? { animationDelay: "600ms" }
                : undefined
            }
          />
          <span
            className={cn(
              "font-body text-[11px]",
              i === segmentIndex
                ? "font-semibold text-[var(--emerald)]"
                : "text-[var(--text-muted)]",
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScoreReveal({
  score,
  label,
  segmentIndex,
  onConfirm,
  onReconsider,
}: {
  score: number;
  label: RiskLabel;
  segmentIndex: number;
  onConfirm: () => void;
  onReconsider: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [disclaimerVisible, setDisclaimerVisible] = useState(true);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [visible, score]);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div
        className={cn(
          "rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10 transition-all duration-700",
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0",
        )}
      >
        <div className="mb-8 text-center">
          <p className="mb-3 font-body text-[14px] text-[var(--text-secondary)]">
            Your risk profile is
          </p>
          <h1 className="font-display text-[40px] font-bold text-[var(--text-primary)]">
            {label}
          </h1>
          <p className="mt-2 font-body text-[32px] font-semibold tabular-nums text-[var(--emerald)]">
            {animatedScore}
          </p>
        </div>

        <div className="mb-8">
          <SpectrumBar segmentIndex={segmentIndex} animated={visible} />
        </div>

        <p className="mb-8 text-center font-body text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {label === "Conservative" &&
            "You prefer stability and capital preservation. Your plan will focus on lower-volatility investments like bonds, GICs, and dividend-paying funds."}
          {label === "Moderately Conservative" &&
            "You lean toward safety but are open to some growth. Your plan will balance fixed income with moderate equity exposure."}
          {label === "Balanced" &&
            "You're comfortable with a mix of growth and stability. Your plan will blend equities and fixed income for steady long-term performance."}
          {label === "Growth" &&
            "You prioritize growth and can handle market volatility. Your plan will emphasize equities with a smaller fixed-income allocation."}
          {label === "Aggressive" &&
            "You're focused on maximum long-term growth and comfortable with significant volatility. Your plan will be equity-heavy with alternative assets."}
        </p>

        {disclaimerVisible && (
          <div className="mb-6 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
                <p className="font-body text-[12px] leading-relaxed text-[var(--text-muted)]">
                  Your risk profile personalizes your plan. Discuss with a
                  registered advisor before making investment decisions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisclaimerVisible(false)}
                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
          >
            <Shield className="size-4" />
            This is my risk profile
          </button>
          <button
            type="button"
            onClick={onReconsider}
            className="flex-1 rounded-lg border border-[var(--warm-200)] bg-white px-6 py-3 font-display text-[15px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--warm-100)]"
          >
            Let me reconsider
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiskProfilePage() {
  const router = useRouter();
  const { currentStep, completedSteps, setCurrentStep, completeStep } =
    useOnboardingStore();
  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, number>>({});
  const [riskResult, setRiskResult] = useState<{
    score: number;
    label: RiskLabel;
    segmentIndex: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep("risk-profile");
  }, [setCurrentStep]);

  const handleQuestionnaireComplete = (answers: Record<string, number>) => {
    setQuestionnaireAnswers(answers);
    setPhase("conversation");
  };

  const handleConversationComplete = (_insight: string) => {
    const result = computeRiskScore(questionnaireAnswers);
    setRiskResult(result);
    setPhase("reveal");
  };

  const handleConfirm = async () => {
    if (!riskResult) return;

    setIsSubmitting(true);
    setServerError(null);

    const result = await saveRiskProfile({
      questionnaireAnswers,
      riskScore: riskResult.score,
      riskLabel: riskResult.label,
    });

    if (result?.error) {
      setServerError(result.error);
      setIsSubmitting(false);
    } else {
      completeStep("risk-profile");
    }
  };

  const handleReconsider = () => {
    setPhase("questionnaire");
    setQuestionnaireAnswers({});
    setRiskResult(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="shrink-0 px-4">
        <div className="mx-auto max-w-[920px]">
          <div className="flex justify-center">
            <FinovaLogo size="sm" />
          </div>
          <StepProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-4 py-6">
        {phase === "questionnaire" && (
          <QuestionnairePhase onComplete={handleQuestionnaireComplete} />
        )}

        {phase === "conversation" && (
          <ConversationPhase onComplete={handleConversationComplete} />
        )}

        {phase === "reveal" && riskResult && (
          <div className="flex flex-1 items-center justify-center">
            <ScoreReveal
              score={riskResult.score}
              label={riskResult.label}
              segmentIndex={riskResult.segmentIndex}
              onConfirm={handleConfirm}
              onReconsider={handleReconsider}
            />
          </div>
        )}

        {serverError && (
          <div className="mx-auto mt-4 max-w-[640px] rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
            <p className="font-body text-[13px] text-[var(--error)]">
              {serverError}
            </p>
          </div>
        )}

        {isSubmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--warm-50)]/80">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent" />
              <p className="font-body text-[14px] text-[var(--text-secondary)]">
                Saving your risk profile...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
