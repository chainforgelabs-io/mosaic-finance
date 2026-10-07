"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { useWalkthroughStore } from "@/stores/walkthrough-store";
import { FinancialCard } from "@/components/app/FinancialCard";
import {
  CharlieChatHeader,
  CharlieChatSurface,
  ConversationBubble,
  TypingIndicator,
  charlieInputClass,
  charlieSendClass,
} from "@/components/app/ConversationBubble";
import { EmptyState } from "@/components/app/EmptyState";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Send,
  CheckCircle2,
} from "lucide-react";
import type { PlanSection, ConversationMessage, ActionItem } from "@/types";

const SESSION_TYPE = "walkthrough" as const;
const MAX_MESSAGE_CHARS = 3900; // ConversationMessageSchema caps at 4000
const CHARLIE_UNAVAILABLE =
  "Charlie couldn't respond just now. Please try again in a moment.";

/**
 * The user turn that asks Charlie to walk through one section of the report.
 * Only the assistant reply is rendered; this request is not shown in the chat.
 */
function buildSectionIntroRequest(section: PlanSection, index: number, total: number): string {
  const cards = section.cards.map((c) => `${c.label}: ${c.value}${c.unit ? ` ${c.unit}` : ""}`);
  const items = section.actionItems.map((a) => `- ${a.text}`);
  const parts = [
    `I'm walking through my Progress Report with you. This is section ${index + 1} of ${total}: "${section.title}".`,
    `Here is the section as written in my report:\n\n${section.summary}`,
    cards.length ? `Key figures: ${cards.join("; ")}` : "",
    items.length ? `Action items listed in the report:\n${items.join("\n")}` : "",
    "Please walk me through this section in plain language — what it says about my situation and why it matters — then ask whether I have any questions about it. Keep it to a few short paragraphs.",
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, MAX_MESSAGE_CHARS);
}

/** Top action items to echo on the completion card: the Next Steps section first, then the rest. */
function topActionItems(sections: PlanSection[], limit = 3): ActionItem[] {
  const ordered = [
    ...sections.filter((s) => s.id === "next-steps"),
    ...sections.filter((s) => s.id !== "next-steps"),
  ];
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return ordered
    .flatMap((s) => s.actionItems)
    .sort((a, b) => rank[a.priority] - rank[b.priority])
    .slice(0, limit);
}

/** Read one SSE response from /api/conversation/message, calling onDelta with the accumulated text. */
async function readCharlieStream(res: Response, onDelta: (accumulated: string) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
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
      let data: { type?: string; text?: string; message?: string };
      try {
        data = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      if (data.type === "delta" && typeof data.text === "string") {
        accumulated += data.text;
        onDelta(accumulated);
      } else if (data.type === "error") {
        throw new Error(data.message ?? "stream error");
      }
    }
  }
  if (!accumulated) throw new Error("Empty response");
}

function SectionPanel({
  section,
  sectionIndex,
  totalSections,
  onNavigate,
}: {
  section: PlanSection;
  sectionIndex: number;
  totalSections: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--warm-200)] bg-white">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
            Section {sectionIndex + 1} of {totalSections}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--emerald-soft)] text-[var(--emerald-dark)]">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Educational Progress Report
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate(Math.max(0, sectionIndex - 1))}
            disabled={sectionIndex === 0}
            className="p-1 rounded hover:bg-[var(--warm-100)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => onNavigate(Math.min(totalSections - 1, sectionIndex + 1))}
            disabled={sectionIndex === totalSections - 1}
            className="p-1 rounded hover:bg-[var(--warm-100)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)] mb-1">
          {section.title}
        </h2>
        <div className="w-10 h-px bg-[var(--emerald)] mb-4" />

        {section.cards.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {section.cards.map((card, i) => (
              <FinancialCard key={i} {...card} />
            ))}
          </div>
        )}

        {section.actionItems.length > 0 && (
          <div className="mt-4">
            <h4 className="font-[family-name:var(--font-display)] font-semibold text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Action Items
            </h4>
            <ul className="space-y-1.5">
              {section.actionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className="text-[var(--emerald)] mt-0.5">→</span>
                  <span className="font-[family-name:var(--font-body)] text-[var(--text-secondary)]">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--text-muted)]">
              These are options you can take to a licensed financial advisor to discuss. This is
              educational information, not financial advice.
            </p>
          </div>
        )}

        {section.etfTable && section.etfTable.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <p className="mb-2 font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[var(--text-muted)]">
              Named funds are examples of a category. This is educational information, not financial advice.
            </p>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--warm-200)]">
                  <th className="pb-2 font-semibold text-[var(--text-muted)]">Ticker</th>
                  <th className="pb-2 font-semibold text-[var(--text-muted)]">Name</th>
                  <th className="pb-2 font-semibold text-[var(--text-muted)]">MER</th>
                </tr>
              </thead>
              <tbody>
                {section.etfTable.map((etf) => (
                  <tr key={etf.ticker} className="border-b border-[var(--warm-200)]/50">
                    <td className="py-1.5 font-semibold text-[var(--emerald)]">{etf.ticker}</td>
                    <td className="py-1.5 text-[var(--text-secondary)]">{etf.name}</td>
                    <td className="py-1.5 tabular-nums text-[var(--text-secondary)]">{etf.mer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--warm-200)] bg-white px-5 py-3">
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Jump to section
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: totalSections }, (_, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  i === sectionIndex
                    ? "bg-[var(--emerald)] text-white"
                    : "bg-[var(--warm-100)] text-[var(--text-secondary)] hover:bg-[var(--warm-200)]"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
    </div>
  );
}

function ConversationPanel({
  section,
  messages,
  isStreaming,
  isComplete,
  onSendMessage,
  onNextSection,
  isLastSection,
  hasReceivedIntro,
  totalSections,
  topItems,
}: {
  section: PlanSection;
  messages: ConversationMessage[];
  isStreaming: boolean;
  isComplete: boolean;
  onSendMessage: (text: string) => void;
  onNextSection: () => void;
  isLastSection: boolean;
  hasReceivedIntro: boolean;
  totalSections: number;
  topItems: ActionItem[];
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <CharlieChatSurface className="h-full">
      <CharlieChatHeader subtitle={section.title} />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-[720px] flex-col gap-4">
        {messages.map((msg) => (
          <ConversationBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
          />
        ))}
        {isStreaming && <TypingIndicator />}

        {isComplete && (
          <div className="mt-6 p-5 bg-white border border-[var(--emerald)] rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--emerald)]" />
              <span className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">
                Guided Walkthrough Complete
              </span>
            </div>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mb-3">
              You&apos;ve walked through all {totalSections} sections of your Progress Report.
              {topItems.length > 0 && " Here are the action items from your report to consider discussing with a licensed advisor:"}
            </p>
            {topItems.length > 0 && (
              <ol className="space-y-2">
                {topItems.map((item, i) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="bg-[var(--emerald)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-[var(--warm-200)] bg-white px-4 py-3">
        {!isComplete && hasReceivedIntro && !isLastSection && (
          <button
            onClick={onNextSection}
            disabled={isStreaming}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50"
          >
            Next Section
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {!isComplete && isLastSection && hasReceivedIntro && (
          <button
            onClick={onNextSection}
            disabled={isStreaming}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Walkthrough
          </button>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            disabled={isStreaming || isComplete}
            rows={1}
            className={charlieInputClass}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isComplete}
            className={charlieSendClass}
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] mt-2 text-center">
          Your responses are encrypted and never shared.
        </p>
      </div>
    </CharlieChatSurface>
  );
}

export default function WalkthroughPage() {
  const { plan } = usePlanStore();
  const {
    currentSectionIndex,
    messages,
    isStreaming,
    isComplete,
    setCurrentSectionIndex,
    advanceSection,
    addMessage,
    updateMessage,
    setIsStreaming,
    setIsComplete,
    reset,
  } = useWalkthroughStore();

  const [hasReceivedIntro, setHasReceivedIntro] = useState(false);
  const [showMobileSection, setShowMobileSection] = useState(false);
  const introSentForSection = useRef<number>(-1);
  const sessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const sessionBlockedRef = useRef(false);
  const streamingRef = useRef(false);

  useEffect(() => {
    reset();
    introSentForSection.current = -1;
    setHasReceivedIntro(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postAssistant = useCallback(
    (content: string) =>
      addMessage({
        id: `msg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
      }),
    [addMessage],
  );

  /** Start (or resume) the walkthrough session once; surfaces entitlement errors as a Charlie message. */
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionBlockedRef.current) return null;
    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = (async () => {
        try {
          const res = await fetch("/api/conversation/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: SESSION_TYPE }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
            sessionBlockedRef.current = res.status === 402;
            postAssistant(typeof body?.error === "string" ? body.error : CHARLIE_UNAVAILABLE);
            return null;
          }
          const { sessionId } = (await res.json()) as { sessionId: string };
          sessionIdRef.current = sessionId;
          return sessionId;
        } catch {
          postAssistant(CHARLIE_UNAVAILABLE);
          return null;
        } finally {
          sessionPromiseRef.current = null;
        }
      })();
    }
    return sessionPromiseRef.current;
  }, [postAssistant]);

  /** Send one user turn to Charlie and stream the reply into the chat. */
  const askCharlie = useCallback(
    async (message: string, onComplete?: () => void) => {
      const sessionId = await ensureSession();
      if (!sessionId) {
        onComplete?.();
        return;
      }
      streamingRef.current = true;
      setIsStreaming(true);
      const assistantId = `msg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      let added = false;
      try {
        const res = await fetch("/api/conversation/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message, sessionType: SESSION_TYPE }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await readCharlieStream(res, (accumulated) => {
          if (!added) {
            added = true;
            addMessage({
              id: assistantId,
              role: "assistant",
              content: accumulated,
              timestamp: new Date().toISOString(),
            });
          } else {
            updateMessage(assistantId, accumulated);
          }
        });
      } catch {
        if (!added) postAssistant(CHARLIE_UNAVAILABLE);
      } finally {
        streamingRef.current = false;
        setIsStreaming(false);
        onComplete?.();
      }
    },
    [ensureSession, addMessage, updateMessage, postAssistant, setIsStreaming],
  );

  useEffect(() => {
    if (!plan?.sections.length) return;
    if (introSentForSection.current === currentSectionIndex) return;
    if (streamingRef.current) return; // never open a second stream (dev double-mount)
    introSentForSection.current = currentSectionIndex;

    const section = plan.sections[currentSectionIndex];
    setHasReceivedIntro(false);
    void askCharlie(
      buildSectionIntroRequest(section, currentSectionIndex, plan.sections.length),
      () => setHasReceivedIntro(true),
    );
  }, [currentSectionIndex, plan, askCharlie]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!plan || streamingRef.current) return;
      addMessage({
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      });
      void askCharlie(text.slice(0, MAX_MESSAGE_CHARS));
    },
    [plan, addMessage, askCharlie]
  );

  const handleNextSection = useCallback(() => {
    if (!plan || streamingRef.current) return;
    if (currentSectionIndex >= plan.sections.length - 1) {
      setIsComplete(true);
      return;
    }
    advanceSection();
  }, [plan, currentSectionIndex, advanceSection, setIsComplete]);

  const handleNavigateSection = useCallback(
    (index: number) => {
      if (streamingRef.current || index === currentSectionIndex) return;
      setCurrentSectionIndex(index);
      introSentForSection.current = -1;
    },
    [setCurrentSectionIndex, currentSectionIndex]
  );

  if (!plan || plan.status !== "delivered") {
    return (
      <EmptyState
        icon={FileText}
        title="Complete setup to access the guided walkthrough with Charlie."
        description="Once your Progress Report is ready, you can walk through it section by section with Charlie. This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes."
      />
    );
  }

  const currentSection = plan.sections[currentSectionIndex];

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-hidden md:-mx-6 md:-my-8 md:h-[calc(100dvh-4.75rem)] md:flex-row">
      <div className="hidden md:flex w-[40%] border-r border-[var(--warm-200)] bg-white flex-col overflow-hidden">
        <SectionPanel
          section={currentSection}
          sectionIndex={currentSectionIndex}
          totalSections={plan.sections.length}
          onNavigate={handleNavigateSection}
        />
      </div>

      <div className="md:hidden border-b border-[var(--warm-200)] bg-white">
        <button
          type="button"
          onClick={() => setShowMobileSection((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
            {currentSection.title}
          </span>
          <ChevronDown className={`size-4 text-[var(--text-muted)] transition ${showMobileSection ? "rotate-180" : ""}`} />
        </button>
        {showMobileSection && (
          <div className="max-h-[45vh] overflow-y-auto border-t border-[var(--warm-200)]">
            <SectionPanel
              section={currentSection}
              sectionIndex={currentSectionIndex}
              totalSections={plan.sections.length}
              onNavigate={(i) => {
                handleNavigateSection(i);
                setShowMobileSection(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ConversationPanel
          section={currentSection}
          messages={messages}
          isStreaming={isStreaming}
          isComplete={isComplete}
          onSendMessage={handleSendMessage}
          onNextSection={handleNextSection}
          isLastSection={currentSectionIndex === plan.sections.length - 1}
          hasReceivedIntro={hasReceivedIntro}
          totalSections={plan.sections.length}
          topItems={topActionItems(plan.sections)}
        />
      </div>
    </div>
  );
}
