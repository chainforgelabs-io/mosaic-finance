"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { useWalkthroughStore } from "@/stores/walkthrough-store";
import { FinancialCard } from "@/components/app/FinancialCard";
import { ConversationBubble, TypingIndicator } from "@/components/app/ConversationBubble";
import { EmptyState } from "@/components/app/EmptyState";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Send,
  CheckCircle2,
} from "lucide-react";
import type { PlanSection, ConversationMessage } from "@/types";

function generateWalkthroughIntro(section: PlanSection): string {
  const introMap: Record<string, string> = {
    "executive-summary": `Let's start with the big picture. Your financial health score is ${
      section.cards.find((c) => c.label === "HEALTH SCORE")?.value || "strong"
    }, which puts you in a solid position.\n\n${section.summary}\n\nThe key takeaway here is that you have a strong foundation with clear opportunities for improvement. Your savings rate is above average, and with some strategic adjustments, we can accelerate your timeline significantly.\n\nDo you have any questions about your overall financial snapshot?`,

    "cash-flow": `Now let's look at how money flows through your life each month. Understanding this is the foundation of everything else in your Progress Report.\n\nYour net income of ${
      section.cards.find((c) => c.label === "NET INCOME")?.value || "$6,250"
    }/month supports a healthy savings rate. ${section.summary}\n\nThe biggest insight here is that even small optimizations in your discretionary spending can have outsized effects when redirected to investments over decades.\n\nWould you like me to break down any specific expense category?`,

    "debt-management": `Let's talk about your debt picture. Not all debt is created equal, and understanding the difference is key to a smart payoff strategy.\n\n${section.summary}\n\nYour mortgage is structured well — the focus area is your line of credit, where accelerating payments saves significant interest. The avalanche method (targeting highest-rate debt first) is optimal here.\n\nAny questions about this debt repayment approach?`,

    "retirement": `This is where long-term planning gets exciting. Let's look at your retirement projections.\n\n${section.summary}\n\nThe math here is powerful — by maintaining your contribution rate and optimizing your investment allocation, you could potentially retire ${
      section.cards.find((c) => c.label === "TARGET RETIREMENT")?.value || "earlier than expected"
    }. The most critical factor is consistency.\n\nWhat questions do you have about your retirement projections?`,

    "investment-strategy": `Now let's dive into how your money is currently invested. This is where your risk profile shapes the educational options we show.\n\n${section.summary}\n\nThe suggested portfolio targets a ${
      section.cards.find((c) => c.label === "WEIGHTED MER")?.value || "0.18%"
    } weighted MER, which is significantly lower than the Canadian average of ~1.5%. This fee reduction alone could add over $100,000 to your portfolio over 25 years.\n\nWould you like me to explain any of the ETF considerations in more detail?`,

    "tax-optimization": `Tax efficiency is often the most overlooked area of personal finance, but it can have enormous impact.\n\n${section.summary}\n\nThe priority waterfall — RRSP match, TFSA, RRSP, then non-registered — is an educational framework for capturing tax advantages. With ${
      section.cards.find((c) => c.label === "RRSP ROOM")?.value || "$18,200"
    } of unused RRSP room, there's an immediate opportunity.\n\nDo you have questions about this tax strategy?`,

    "insurance-estate": `Let's look at the protection side of your Progress Report. Insurance and estate topics aren't exciting, but they protect everything else we've discussed.\n\n${section.summary}\n\nThe key educational takeaway: a $500K term life policy and a basic will are high-priority items that most Canadians delay too long. The cost is relatively modest for the protection provided.\n\nThis is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.\n\nAny questions about the insurance or estate considerations?`,

    "next-steps": `Finally, let's talk about turning this Progress Report into action. Tracking only helps if you follow through — with your advisor's guidance.\n\n${section.summary}\n\nI've prioritized items by impact and urgency. The two highest-impact items you could discuss this week are setting up automated RRSP contributions and increasing your line of credit payments. Together, these two changes could improve your projected retirement age by 2.5 years.\n\nThis is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.\n\nWould you like to discuss the timeline for any of these items?`,
  };

  return introMap[section.id] || `Let's review your ${section.title}.\n\n${section.summary}\n\nDo you have any questions about this section?`;
}

function generateFollowUpResponse(userMessage: string, section: PlanSection): string {
  const responses = [
    `That's a great question about your ${section.title.toLowerCase()}. Based on your plan data, ${section.prose.split(".").slice(0, 2).join(".")}.\n\nThe key thing to remember is that these considerations are interconnected — changes in this area will positively impact your overall health score.`,
    `I understand your concern. Let me clarify — ${section.actionItems[0]?.text || "the primary consideration"} is prioritized because it has the highest expected impact relative to effort. However, the timeline is flexible and we can adjust based on your comfort level.\n\nWould you like to explore an alternative approach?`,
    `Absolutely. Looking at the data in your plan, ${section.prose.split(".").slice(2, 4).join(".")}.\n\nThis is one of those areas where consistency matters more than perfection. Starting with any amount is better than waiting for the "perfect" time.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
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

      <div className="flex-1 overflow-y-auto p-5">
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
          </div>
        )}

        {section.etfTable && section.etfTable.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--warm-200)]">
                  <th className="pb-2 font-semibold text-[var(--text-muted)]">Ticker</th>
                  <th className="pb-2 font-semibold text-[var(--text-muted)]">Alloc</th>
                  <th className="pb-2 font-semibold text-[var(--text-muted)]">MER</th>
                </tr>
              </thead>
              <tbody>
                {section.etfTable.map((etf) => (
                  <tr key={etf.ticker} className="border-b border-[var(--warm-200)]/50">
                    <td className="py-1.5 font-semibold text-[var(--emerald)]">{etf.ticker}</td>
                    <td className="py-1.5 tabular-nums">{etf.allocation}</td>
                    <td className="py-1.5 tabular-nums text-[var(--text-secondary)]">{etf.mer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section navigator chips */}
        <div className="mt-6 pt-4 border-t border-[var(--warm-200)]">
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
}: {
  section: PlanSection;
  messages: ConversationMessage[];
  isStreaming: boolean;
  isComplete: boolean;
  onSendMessage: (text: string) => void;
  onNextSection: () => void;
  isLastSection: boolean;
  hasReceivedIntro: boolean;
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
    <div className="h-full flex flex-col bg-[var(--warm-50)]">
      <div className="px-5 py-3 border-b border-[var(--warm-200)] bg-white">
        <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
          Guided Walkthrough with Charlie
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
          Discussing: {section.title}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
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
              You&apos;ve walked through all 8 sections of your Progress Report. Here are your top 3 items to consider:
            </p>
            <ol className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-[var(--emerald)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                  Maximize RRSP contribution ($18,200 room available)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[var(--emerald)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                  Consolidate investments into low-MER ETF portfolio
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[var(--emerald)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                  Accelerate line of credit repayment to $600/mo
                </span>
              </li>
            </ol>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--warm-200)] bg-white px-5 py-3">
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
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--emerald)] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isComplete}
            className="w-10 h-10 rounded-full bg-[var(--slate-950)] flex items-center justify-center shrink-0 hover:bg-[var(--slate-950)]/80 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4 text-[var(--emerald)]" />
          </button>
        </div>
        <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] mt-2 text-center">
          Your responses are encrypted and never shared.
        </p>
      </div>
    </div>
  );
}

export default function WalkthroughPage() {
  const { plan, loadMockData } = usePlanStore();
  const {
    currentSectionIndex,
    messages,
    isStreaming,
    isComplete,
    setCurrentSectionIndex,
    advanceSection,
    addMessage,
    setIsStreaming,
    setIsComplete,
    reset,
  } = useWalkthroughStore();

  const [hasReceivedIntro, setHasReceivedIntro] = useState(false);
  const [showMobileSection, setShowMobileSection] = useState(false);
  const introSentForSection = useRef<number>(-1);

  useEffect(() => {
    if (!plan || plan.status !== "delivered") {
      loadMockData("delivered");
    }
  }, [plan, loadMockData]);

  useEffect(() => {
    reset();
    introSentForSection.current = -1;
    setHasReceivedIntro(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulateStreaming = useCallback(
    (content: string, onComplete?: () => void) => {
      setIsStreaming(true);
      setTimeout(() => {
        addMessage({
          id: `msg-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        });
        setIsStreaming(false);
        onComplete?.();
      }, 800 + Math.random() * 600);
    },
    [addMessage, setIsStreaming]
  );

  useEffect(() => {
    if (!plan?.sections.length) return;
    if (introSentForSection.current === currentSectionIndex) return;
    introSentForSection.current = currentSectionIndex;

    const section = plan.sections[currentSectionIndex];
    const intro = generateWalkthroughIntro(section);
    setHasReceivedIntro(false);
    simulateStreaming(intro, () => setHasReceivedIntro(true));
  }, [currentSectionIndex, plan, simulateStreaming]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!plan) return;
      addMessage({
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      });

      const section = plan.sections[currentSectionIndex];
      const response = generateFollowUpResponse(text, section);
      simulateStreaming(response);
    },
    [plan, currentSectionIndex, addMessage, simulateStreaming]
  );

  const handleNextSection = useCallback(() => {
    if (!plan) return;
    if (currentSectionIndex >= plan.sections.length - 1) {
      setIsComplete(true);
      return;
    }
    advanceSection();
  }, [plan, currentSectionIndex, advanceSection, setIsComplete]);

  const handleNavigateSection = useCallback(
    (index: number) => {
      setCurrentSectionIndex(index);
      introSentForSection.current = -1;
    },
    [setCurrentSectionIndex]
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
    <div className="-mx-4 -my-6 flex h-[calc(100vh-5.5rem)] flex-col md:-mx-6 md:-my-8 md:h-[calc(100vh-0px)] md:flex-row">
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
        />
      </div>
    </div>
  );
}
