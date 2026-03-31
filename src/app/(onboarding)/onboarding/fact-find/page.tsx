"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, AlertTriangle, Paperclip, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { MosaicLogo } from "@/components/app/MosaicLogo";
import { ConversationBubble } from "@/components/app/ConversationBubble";
import { ConversationErrorBoundary } from "@/components/app/ConversationErrorBoundary";
import { useOnboardingStore } from "@/stores/onboarding";
import {
  useConversationStore,
  type ExtractedTopics,
} from "@/stores/conversation";
import { createClient } from "@/lib/supabase/client";
import { shouldExcludeFromInvestmentHoldings } from "@/lib/schemas/holdings";


const TOPICS: { key: keyof ExtractedTopics; label: string }[] = [
  { key: "income", label: "Income" },
  { key: "expenses", label: "Expenses" },
  { key: "debts", label: "Debts" },
  { key: "goals", label: "Goals" },
  { key: "retirement", label: "Retirement" },
  { key: "investments", label: "Investments" },
];

const ASSET_CATEGORY_MAP: Record<string, string> = {
  real_estate: "real_estate", property: "real_estate", home: "real_estate", house: "real_estate",
  vehicle: "vehicle", car: "vehicle", truck: "vehicle", auto: "vehicle",
  land: "land",
  precious_metals: "precious_metals", gold: "precious_metals", silver: "precious_metals",
  collectibles: "collectibles",
};

function mapToValidAssetCategory(raw: string): string {
  return ASSET_CATEGORY_MAP[raw.toLowerCase()] ?? "other";
}

function deriveTopicsFromSummary(summary: Record<string, unknown>): Partial<ExtractedTopics> {
  const topics: Partial<ExtractedTopics> = {};
  if (summary.annual_income != null || summary.household_total_income != null || summary.spouse_annual_income != null) {
    topics.income = true;
  }
  if (summary.monthly_expenses != null || summary.monthly_savings != null) {
    topics.expenses = true;
  }
  const debts = summary.debts;
  if (Array.isArray(debts) && debts.length > 0) {
    topics.debts = true;
  }
  const goals = summary.goals;
  if (Array.isArray(goals) && goals.length > 0) {
    topics.goals = true;
  }
  if (summary.retirement_target_age != null) {
    topics.retirement = true;
  }
  const accounts = summary.investment_accounts;
  if (Array.isArray(accounts) && accounts.length > 0) {
    topics.investments = true;
  }
  if (summary.investment_knowledge != null) {
    topics.knowledge = true;
  }
  if (summary.risk_score != null) {
    topics.risk = true;
  }
  return topics;
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
              Mosaic Finance is a financial planning tool, not a registered investment
              advisor. All plans are reviewed by a registered financial professional before
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

function formatSummaryAsBullets(summary: Record<string, unknown>): string[] {
  const bullets: string[] = [];

  const income = summary.annual_income as number | undefined;
  const spouseIncome = summary.spouse_annual_income as number | undefined;
  const province = summary.province as string | undefined;
  const family = summary.family_structure as string | undefined;
  if (income != null || spouseIncome != null || province || family) {
    const parts: string[] = [];
    if (income != null) parts.push(`You: $${Number(income).toLocaleString("en-CA")}/yr`);
    if (spouseIncome != null && spouseIncome > 0) parts.push(`Spouse: $${Number(spouseIncome).toLocaleString("en-CA")}/yr`);
    if (province) parts.push(province);
    if (family) parts.push(family);
    bullets.push(`**You and your household:** ${parts.join(" · ")}`);
  }

  const expenses = summary.monthly_expenses as number | undefined;
  const savings = summary.monthly_savings as number | undefined;
  const emergency = summary.emergency_fund_months as number | undefined;
  if (expenses != null || savings != null || emergency != null) {
    const parts: string[] = [];
    if (expenses != null) parts.push(`Expenses: $${Number(expenses).toLocaleString("en-CA")}/mo`);
    if (savings != null) parts.push(`Savings: $${Number(savings).toLocaleString("en-CA")}/mo`);
    if (emergency != null) parts.push(`Emergency fund: ${Number(emergency)} months`);
    bullets.push(`**Monthly:** ${parts.join(" · ")}`);
  }

  const debts = summary.debts as Array<{ type: string; balance: number; rate?: number }> | undefined;
  if (Array.isArray(debts) && debts.length > 0) {
    const debtStrs = debts.map(
      (d) => `${d.type}: $${Number(d.balance).toLocaleString("en-CA")}${d.rate != null ? ` @ ${d.rate}%` : ""}`,
    );
    bullets.push(`**Debts:** ${debtStrs.join("; ")}`);
  }

  const accounts = summary.investment_accounts as Array<{ account_type: string; approximate_balance: number }> | undefined;
  if (Array.isArray(accounts) && accounts.length > 0) {
    const acctStrs = accounts.map(
      (a) => `${a.account_type}: $${Number(a.approximate_balance ?? 0).toLocaleString("en-CA")}`,
    );
    bullets.push(`**Savings & investments:** ${acctStrs.join("; ")}`);
  }

  const ins = summary.insurance_coverage as Record<string, { has_coverage?: boolean }> | undefined;
  if (ins && typeof ins === "object") {
    const parts: string[] = [];
    if (ins.life?.has_coverage) parts.push("Life");
    if (ins.disability?.has_coverage) parts.push("Disability");
    if (ins.critical_illness?.has_coverage) parts.push("Critical illness");
    if (parts.length > 0) bullets.push(`**Insurance:** ${parts.join(", ")}`);
  }

  const retireAge = summary.retirement_target_age as number | undefined;
  if (retireAge != null) bullets.push(`**Retirement:** Target age ${retireAge}`);

  const goals = summary.goals as Array<{ type: string }> | undefined;
  const special = summary.special_situation_notes as string | undefined;
  if ((Array.isArray(goals) && goals.length > 0) || special) {
    const parts: string[] = [];
    if (Array.isArray(goals)) goals.forEach((g) => parts.push(g.type));
    if (special) parts.push(special);
    if (parts.length > 0) bullets.push(`**Other:** ${parts.join("; ")}`);
  }

  return bullets;
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

  const bullets = formatSummaryAsBullets(summary);
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

      {bullets.length > 0 && (
        <ul className="mb-4 list-inside list-disc space-y-2 font-body text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {bullets.map((line, i) => {
            const match = line.match(/\*\*(.+?)\*\*:\s*(.*)/);
            if (match) {
              return (
                <li key={i}>
                  <span className="font-semibold text-[var(--text-primary)]">{match[1]}:</span> {match[2]}
                </li>
              );
            }
            return <li key={i}>{line.replace(/\*\*/g, "")}</li>;
          })}
        </ul>
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
    async function seedTopics() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("annual_income")
        .eq("id", user.id)
        .single();
      const seeded: Partial<ExtractedTopics> = {};
      if (profile?.annual_income != null && profile.annual_income > 0) {
        seeded.income = true;
      }
      if (Object.keys(seeded).length > 0) setExtractedTopics(seeded);
    }
    seedTopics();
  }, [setExtractedTopics]);

  useEffect(() => {
    if (sessionComplete && summaryData && typeof summaryData === "object") {
      const derived = deriveTopicsFromSummary(summaryData as Record<string, unknown>);
      setExtractedTopics(derived);
    }
  }, [sessionComplete, summaryData, setExtractedTopics]);

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
                  if (data.topicsCovered && Array.isArray(data.topicsCovered)) {
                    const derived: Partial<ExtractedTopics> = {};
                    const current = useConversationStore.getState().extractedTopics;
                    for (const t of data.topicsCovered) {
                      if (typeof t === "string" && t in current) {
                        (derived as Record<string, boolean>)[t] = true;
                      }
                    }
                    if (Object.keys(derived).length > 0) {
                      setExtractedTopics(derived);
                    }
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

        // Trailing chunk may leave an unparsed `data:` line (no final newline)
        if (buffer.startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.type === "delta" && typeof data.text === "string") {
              lastDeltaTime = Date.now();
              accumulated += data.text;
              updateLastAssistantMessage(accumulated);
            }
            if (data.type === "done") {
              if (data.sessionComplete && data.extractedData) {
                setSessionComplete(true);
                setSummaryData(data.extractedData);
              }
              if (data.topicsCovered && Array.isArray(data.topicsCovered)) {
                const derived: Partial<ExtractedTopics> = {};
                const current = useConversationStore.getState().extractedTopics;
                for (const t of data.topicsCovered) {
                  if (typeof t === "string" && t in current) {
                    (derived as Record<string, boolean>)[t] = true;
                  }
                }
                if (Object.keys(derived).length > 0) {
                  setExtractedTopics(derived);
                }
              }
            }
            if (data.type === "error") {
              setError(data.message ?? "An error occurred");
            }
          } catch {
            /* incomplete JSON in buffer */
          }
        }

        clearInterval(preparingTimer);
        setIsPreparingAssessment(false);

        accumulated = accumulated
          .replace(/<TOPICS_COVERED>[\s\S]*?<\/TOPICS_COVERED>/g, "")
          .trim();
        updateLastAssistantMessage(accumulated);

        if (accumulated.includes("<FACT_FIND_COMPLETE>")) {
          const cleaned = accumulated
            .replace(/<FACT_FIND_COMPLETE>[\s\S]*/, "")
            .trim();
          const shortIntro = "Perfect. Let me pull everything together and make sure I've got it right.";
          updateLastAssistantMessage(
            cleaned && cleaned.length <= 80 ? cleaned : shortIntro,
          );
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
      setExtractedTopics,
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
        type InvAcc = {
          account_type: string;
          approximate_balance: number;
          description: string;
          holdings?: { ticker?: string; name?: string; balance: number; units?: number | null }[];
        };
        const accounts: InvAcc[] = (data.investment_accounts as InvAcc[])
          .map((a) => ({
            ...a,
            account_type:
              a.account_type === "Savings-Account" ? "Bank-Account" : a.account_type,
          }))
          .filter(
            (a) => !shouldExcludeFromInvestmentHoldings(a.account_type, a.description),
          );

        const hasBankAccount = accounts.some(
          (a) => a.account_type === "Bank-Account" || a.account_type === "Savings-Account",
        );

        if (!hasBankAccount) {
          const efMonths = Number(data.emergency_fund_months ?? 0);
          const monthlyExp = Number(data.monthly_expenses ?? 0);
          const efBalance =
            efMonths > 0 && monthlyExp > 0 ? Math.round(efMonths * monthlyExp) : 0;

          if (efBalance > 0) {
            accounts.push({
              account_type: "Bank-Account",
              approximate_balance: efBalance,
              description: "Emergency fund / cash savings",
              holdings: [
                { ticker: "CASH", name: "Cash savings", balance: efBalance, units: null },
              ],
            });
          }
        }

        setFactFindAccounts(accounts);
      }

      if (Array.isArray(data.fixed_assets)) {
        try {
          await fetch("/api/fixed-assets?all=true", {
            method: "DELETE",
            credentials: "include",
          });
        } catch {
          console.warn("[fact-find] Failed to clear existing fixed assets before re-save");
        }
        for (const asset of data.fixed_assets as Record<string, unknown>[]) {
          try {
            const category = mapToValidAssetCategory(String(asset.category ?? "other"));
            const name = String(asset.name ?? "Unknown Asset");
            const isHome = category === "real_estate" &&
              (asset.is_primary_residence === true ||
               /home|house|residence|condo|townhouse|primary/i.test(name));

            const res = await fetch("/api/fixed-assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                category,
                name,
                estimated_value: Number(asset.estimated_value ?? 0),
                purchase_price: asset.purchase_price != null ? Number(asset.purchase_price) : null,
                is_primary_residence: isHome,
                notes: asset.notes != null ? String(asset.notes) : null,
              }),
            });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              console.warn("[fact-find] Failed to save fixed asset:", name, errBody);
            }
          } catch (err) {
            console.warn("[fact-find] Failed to save fixed asset:", asset.name, err);
          }
        }
      }

      try {
        const res = await fetch("/api/financial-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          console.warn("[fact-find] Failed to persist financial profile");
        }
      } catch (e) {
        console.warn("[fact-find] financial-profile request failed", e);
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
        <div className="shrink-0 px-4 pt-8">
          <div className="mx-auto max-w-[920px]">
            <div className="flex justify-center">
              <MosaicLogo size="sm" />
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
