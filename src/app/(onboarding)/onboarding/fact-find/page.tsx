"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, AlertTriangle, Paperclip, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { ConversationBubble } from "@/components/app/ConversationBubble";
import { ConversationErrorBoundary } from "@/components/app/ConversationErrorBoundary";
import { useOnboardingStore } from "@/stores/onboarding";
import {
  useConversationStore,
  type ExtractedTopics,
} from "@/stores/conversation";


const TOPICS: { key: keyof ExtractedTopics; label: string }[] = [
  { key: "income", label: "Income" },
  { key: "expenses", label: "Expenses" },
  { key: "debts", label: "Debts" },
  { key: "goals", label: "Goals" },
  { key: "retirement", label: "Retirement" },
  { key: "investments", label: "Investments" },
  { key: "risk", label: "Risk Profile" },
];

const TOPIC_KEYWORDS: Record<keyof ExtractedTopics, RegExp> = {
  income: /income|salary|earn|gross|net pay|household income|take.?home/i,
  expenses: /expense|spending|cost|rent|mortgage payment|groceries|utilities|monthly bill/i,
  debts: /debt|loan|credit|owe|balance|interest rate|line of credit|mortgage.*\$|student loan/i,
  goals: /goal|objective|plan to|want to|hope to|saving for|priority|financial freedom/i,
  retirement: /retire|retirement|cpp|oas|pension|rsp|rrsp|age 6[0-9]|age 55/i,
  investments: /invest|portfolio|etf|stock|bond|tfsa|rrsp|fhsa|esop|mutual fund|account.*balance/i,
  knowledge: /knowledge|experience|familiar|understand.*risk|novice|beginner|intermediate|advanced|comfortable with/i,
  risk: /risk|volatil|market drop|decline|loss|conservative|aggressive|growth|balanced|comfort.*with.*los|react.*drop|sell everything|buy more|gut reaction/i,
};

function detectTopics(messages: { role: string; content: string }[]): Partial<ExtractedTopics> {
  const allText = messages.map((m) => m.content).join(" ");
  const detected: Partial<ExtractedTopics> = {};
  for (const [key, pattern] of Object.entries(TOPIC_KEYWORDS)) {
    if (pattern.test(allText)) {
      detected[key as keyof ExtractedTopics] = true;
    }
  }
  return detected;
}

function ComplianceCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8">
      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-6">
        <div className="mb-3 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--warning)]" />
          <div>
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              Before we begin
            </h3>
            <p className="mt-1.5 font-body text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Finova AI is a financial planning tool, not a registered investment
              advisor. All plans are reviewed by a CIM professional before
              delivery.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onDismiss}
            className="rounded-lg bg-[var(--emerald)] px-5 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
          >
            I understand, let&apos;s start
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressSidebar({ topics }: { topics: ExtractedTopics }) {
  return (
    <div className="hidden w-[200px] shrink-0 border-l border-[var(--warm-200)] bg-white p-5 lg:block">
      <h3 className="mb-4 font-display text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Topics Covered
      </h3>
      <ul className="space-y-3">
        {TOPICS.map(({ key, label }) => {
          const covered = topics[key];
          return (
            <li key={key} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full transition-colors",
                  covered
                    ? "bg-[var(--emerald)]"
                    : "border border-[var(--warm-200)]",
                )}
              >
                {covered && (
                  <Check className="size-2.5 text-white" strokeWidth={3} />
                )}
              </span>
              <span
                className={cn(
                  "font-body text-[13px]",
                  covered
                    ? "font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-muted)]",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryCard({
  summary,
  onConfirm,
  onCorrect,
  isSubmitting,
}: {
  summary: Record<string, unknown>;
  onConfirm: () => void;
  onCorrect: () => void;
  isSubmitting: boolean;
}) {
  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object" && value !== null) return JSON.stringify(value);
    return String(value ?? "—");
  };

  const displayFields: { key: string; label: string }[] = [
    { key: "annual_income", label: "Annual Income" },
    { key: "monthly_expenses", label: "Monthly Expenses" },
    { key: "emergency_fund_months", label: "Emergency Fund (months)" },
    { key: "retirement_target_age", label: "Target Retirement Age" },
    { key: "investment_knowledge", label: "Investment Knowledge" },
    { key: "risk_score", label: "Risk Profile" },
    { key: "province", label: "Province" },
    { key: "family_structure", label: "Family Structure" },
  ];

  return (
    <div className="mt-4 rounded-lg border-2 border-[var(--emerald)] bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-[var(--emerald)]/10">
          <Check className="size-4 text-[var(--emerald)]" />
        </div>
        <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)]">
          Assessment Complete
        </h3>
      </div>

      {typeof summary.conversational_summary === "string" && (
        <p className="mb-4 font-body text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {summary.conversational_summary}
        </p>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {displayFields.map(({ key, label }) => {
          const value = summary[key];
          if (value === undefined || value === null) return null;
          return (
            <div
              key={key}
              className="rounded-lg bg-[var(--warm-50)] px-3 py-2.5"
            >
              <dt className="font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {label}
              </dt>
              <dd className="mt-0.5 font-body text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                {formatValue(value)}
              </dd>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-5 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Looks right — continue"}
        </button>
        <button
          onClick={onCorrect}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-[var(--warm-200)] bg-white px-5 py-2.5 font-display text-[14px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--warm-100)] disabled:opacity-60"
        >
          Let me correct something
        </button>
      </div>
    </div>
  );
}

function FactFindConversation() {
  const router = useRouter();
  const {
    currentStep,
    completedSteps,
    complianceAcknowledged,
    setCurrentStep,
    completeStep,
    setComplianceAcknowledged,
    setFactFindAccounts,
  } = useOnboardingStore();

  const {
    sessionId,
    messages,
    isStreaming,
    extractedTopics,
    sessionComplete,
    summaryData,
    error: conversationError,
    setSessionId,
    addMessage,
    updateLastAssistantMessage,
    setStreaming,
    setExtractedTopics,
    setSessionComplete,
    setSummaryData,
    setError,
    reset: resetConversation,
  } = useConversationStore();

  const [inputValue, setInputValue] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isPreparingAssessment, setIsPreparingAssessment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const errorBoundaryRef = useRef<ConversationErrorBoundary>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    completeStep("profile");
    setCurrentStep("fact-find");
  }, [completeStep, setCurrentStep]);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 && !isStreaming) {
      const detected = detectTopics(messages);
      setExtractedTopics(detected);
    }
  }, [messages, isStreaming, setExtractedTopics]);

  const sendMessage = useCallback(
    async (userMessage?: string) => {
      if (!sessionId) return;

      if (userMessage) {
        addMessage({
          id: `user-${Date.now()}`,
          role: "user",
          content: userMessage,
        });
      }

      const assistantId = `assistant-${Date.now()}`;
      addMessage({ id: assistantId, role: "assistant", content: "" });
      setStreaming(true);
      setError(null);

      errorBoundaryRef.current?.resetTimeout();

      try {
        const res = await fetch("/api/conversation/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: userMessage, sessionType: "fact-find" }),
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        let lastDeltaTime = Date.now();
        let preparingShown = false;

        const preparingTimer = setInterval(() => {
          if (!preparingShown && Date.now() - lastDeltaTime > 3000 && accumulated.length > 0) {
            preparingShown = true;
            setIsPreparingAssessment(true);
          }
        }, 1000);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              switch (data.type) {
                case "delta":
                  lastDeltaTime = Date.now();
                  accumulated += data.text;
                  updateLastAssistantMessage(accumulated);
                  break;
                case "done":
                  if (data.sessionComplete && data.extractedData) {
                    setSessionComplete(true);
                    setSummaryData(data.extractedData);
                  }
                  break;
                case "error":
                  setError(data.message ?? "An error occurred");
                  break;
              }
            } catch {
              // SSE parse error
            }
          }
        }

        clearInterval(preparingTimer);
        setIsPreparingAssessment(false);

        if (accumulated.includes("<FACT_FIND_COMPLETE>")) {
          const cleaned = accumulated
            .replace(/<FACT_FIND_COMPLETE>[\s\S]*/, "")
            .trim();
          if (cleaned) {
            updateLastAssistantMessage(cleaned);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Connection failed. Please retry.",
        );
      } finally {
        setStreaming(false);
        errorBoundaryRef.current?.clearTimeout();
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    },
    [
      sessionId,
      addMessage,
      updateLastAssistantMessage,
      setStreaming,
      setError,
      setSessionComplete,
      setSummaryData,
    ],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!sessionId) return;

      setIsUploadingFile(true);

      addMessage({
        id: `user-file-${Date.now()}`,
        role: "user",
        content: `📎 Uploaded: ${file.name}`,
        attachmentName: file.name,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload/statement", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error ?? "Upload failed");
        }

        const parsed = uploadData.parsedHoldings ?? uploadData;
        const accounts = parsed.accounts ?? [];

        let contextMessage = "I've uploaded a financial statement.";
        if (accounts.length > 0) {
          const accountSummaries = accounts.map(
            (acc: { account_type: string; holdings?: { name?: string; balance?: number }[]; total_value?: number }) => {
              const total = acc.total_value ?? acc.holdings?.reduce((s: number, h: { balance?: number }) => s + (h.balance ?? 0), 0) ?? 0;
              return `${acc.account_type}: $${total.toLocaleString("en-CA")}`;
            },
          );
          contextMessage += ` The statement shows: ${accountSummaries.join(", ")}.`;
        }

        await sendMessage(contextMessage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload statement");
      } finally {
        setIsUploadingFile(false);
        setPendingFile(null);
      }
    },
    [sessionId, addMessage, sendMessage, setError],
  );

  const startConversation = useCallback(async () => {
    if (isStarting || sessionId) return;
    setIsStarting(true);

    try {
      const res = await fetch("/api/conversation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionType: "fact-find" }),
      });
      if (!res.ok) throw new Error("Failed to start session");

      const { sessionId: newSessionId } = await res.json();
      setSessionId(newSessionId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation",
      );
      setIsStarting(false);
    }
  }, [isStarting, sessionId, setSessionId, setError]);

  useEffect(() => {
    if (sessionId && messages.length === 0 && !isStreaming) {
      sendMessage();
    }
  }, [sessionId, messages.length, isStreaming, sendMessage]);

  useEffect(() => {
    if (complianceAcknowledged && !sessionId && !isStarting) {
      startConversation();
    }
  }, [complianceAcknowledged, sessionId, isStarting, startConversation]);

  const handleDismissCompliance = () => {
    setComplianceAcknowledged(true);
  };

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

  const handleConfirm = async () => {
    setIsSubmitting(true);

    if (summaryData && typeof summaryData === "object") {
      const data = summaryData as Record<string, unknown>;

      if (Array.isArray(data.investment_accounts)) {
        setFactFindAccounts(
          data.investment_accounts as { account_type: string; approximate_balance: number; description: string }[],
        );
      }
    }

    completeStep("fact-find");
    router.push("/onboarding/risk-profile");
  };

  const handleCorrect = () => {
    setSessionComplete(false);
    setSummaryData(null);
    sendMessage(
      "I'd like to correct some of the information I provided earlier.",
    );
  };

  const handleRetry = () => {
    resetConversation();
    setIsStarting(false);
    startConversation();
  };

  return (
    <ConversationErrorBoundary ref={errorBoundaryRef} onRetry={handleRetry}>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--warm-50)]">
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

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            {!complianceAcknowledged ? (
              <div className="flex flex-1 items-center justify-center">
                <ComplianceCard onDismiss={handleDismissCompliance} />
              </div>
            ) : (
              <>
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto"
                >
                  <div className="mx-auto max-w-[720px] px-4 py-6">
                    <p className="mb-6 font-body text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Financial Consultation
                    </p>

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

                    {conversationError && (
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

                    {isPreparingAssessment && !sessionComplete && (
                      <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--emerald)]/20 bg-[var(--emerald)]/5 px-4 py-3">
                        <Loader2 className="size-4 animate-spin text-[var(--emerald)]" />
                        <span className="font-body text-[14px] text-[var(--text-secondary)]">
                          Preparing your assessment summary...
                        </span>
                      </div>
                    )}

                    {sessionComplete && summaryData && (
                      <SummaryCard
                        summary={summaryData as unknown as Record<string, unknown>}
                        onConfirm={handleConfirm}
                        onCorrect={handleCorrect}
                        isSubmitting={isSubmitting}
                      />
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {!sessionComplete && (
                  <div className="shrink-0 border-t border-[var(--warm-200)] bg-white">
                    {pendingFile && (
                      <div className="mx-auto flex max-w-[720px] items-center gap-2 px-4 pt-3">
                        <div className="flex items-center gap-2 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] px-3 py-1.5">
                          <Paperclip className="size-3.5 text-[var(--text-muted)]" />
                          <span className="font-body text-[13px] text-[var(--text-secondary)]">
                            {pendingFile.name}
                          </span>
                          <button
                            onClick={() => setPendingFile(null)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mx-auto flex max-w-[720px] items-end gap-3 px-4 py-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isStreaming || isUploadingFile || !sessionId}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--warm-200)] bg-white transition-colors hover:bg-[var(--warm-100)] disabled:opacity-30"
                        title="Attach a financial statement"
                      >
                        {isUploadingFile ? (
                          <Loader2 className="size-4 animate-spin text-[var(--text-muted)]" />
                        ) : (
                          <Paperclip className="size-4 text-[var(--text-muted)]" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                          }
                          if (e.target) e.target.value = "";
                        }}
                      />
                      <textarea
                        ref={textareaRef}
                        autoFocus
                        value={inputValue}
                        onChange={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your response..."
                        disabled={isStreaming || isUploadingFile || !sessionId}
                        rows={1}
                        className="flex-1 resize-none rounded-xl border border-[var(--warm-200)] bg-white px-4 py-2.5 font-body text-[15px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSend}
                        disabled={
                          isStreaming || isUploadingFile || !inputValue.trim() || !sessionId
                        }
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--slate-950)] transition-opacity hover:opacity-80 disabled:opacity-30"
                      >
                        <ArrowUp className="size-5 text-[var(--emerald)]" />
                      </button>
                    </div>
                    <p className="px-4 pb-3 text-center font-body text-[11px] text-[var(--text-muted)]">
                      Your responses are encrypted and never shared. Attach statements anytime.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {complianceAcknowledged && (
            <ProgressSidebar topics={extractedTopics} />
          )}
        </div>
      </div>
    </ConversationErrorBoundary>
  );
}

export default function FactFindPage() {
  return (
    <div className="flex flex-1 flex-col">
      <FactFindConversation />
    </div>
  );
}
