"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ArrowRight,
  Loader2,
  MessageCircle,
  RotateCcw,
  Shield,
  ClipboardList,
  Video,
} from "lucide-react";
import { ConversationBubble } from "@/components/app/ConversationBubble";

type MeetingType = "annual-review" | "ad-hoc";

interface ConvMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MEETING_OPTIONS: {
  type: MeetingType;
  title: string;
  description: string;
  icon: typeof Calendar;
}[] = [
  {
    type: "annual-review",
    title: "Check-in",
    description:
      "Review changes to your life, finances, and goals since your last Progress Report. Reassess your risk comfort and update your trajectory.",
    icon: Calendar,
  },
  {
    type: "ad-hoc",
    title: "Ask a Question",
    description:
      "Have a quick conversation about any financial topic — tax, insurance, retirement, investments, and more. Educational only; speak with a licensed financial advisor before implementing any changes.",
    icon: MessageCircle,
  },
];

export default function MeetingPage() {
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hasReviewExtract, setHasReviewExtract] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startMeeting = useCallback(
    async (type: MeetingType) => {
      if (hasStarted.current) return;
      hasStarted.current = true;
      setMeetingType(type);
      setIsStarting(true);
      setHasReviewExtract(false);

      try {
        const res = await fetch("/api/conversation/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionType: type }),
        });
        if (!res.ok) throw new Error("Failed to start session");
        const { sessionId: sid } = await res.json();
        setSessionId(sid);

        // Send initial message to get the AI greeting
        const msgRes = await fetch("/api/conversation/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            message: type === "annual-review"
              ? "I'd like to do a check-in."
              : "I have a financial education question.",
            sessionType: type,
          }),
        });

        if (!msgRes.ok) throw new Error("Failed");

        const reader = msgRes.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        const assistantId = `assistant-${Date.now()}`;
        setMessages([{ id: assistantId, role: "assistant", content: "" }]);
        setIsStreaming(true);

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
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
                );
              }
              if (data.type === "done" && data.sessionComplete) {
                setSessionComplete(true);
                if (type === "annual-review" && data.extractedData) {
                  setHasReviewExtract(true);
                }
              }
            } catch { /* skip */ }
          }
        }
      } catch {
        setMessages([{
          id: "err",
          role: "assistant",
          content: "Sorry, I couldn't start the meeting. Please try again.",
        }]);
      } finally {
        setIsStarting(false);
        setIsStreaming(false);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    },
    [],
  );

  const sendMessage = async () => {
    if (!sessionId || !inputValue.trim() || isStreaming) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: userMsg }]);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/conversation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMsg,
          sessionType: meetingType,
        }),
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
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
              );
            }
            if (data.type === "done" && data.sessionComplete) {
              setSessionComplete(true);
              if (meetingType === "annual-review" && data.extractedData) {
                setHasReviewExtract(true);
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      // handle error
    } finally {
      setIsStreaming(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const resetMeeting = () => {
    setMeetingType(null);
    setSessionId(null);
    setMessages([]);
    setInputValue("");
    setSessionComplete(false);
    setHasReviewExtract(false);
    hasStarted.current = false;
  };

  // Meeting type selector
  if (!meetingType) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[640px]">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--emerald)]/10">
                <Video className="size-7 text-[var(--emerald)]" />
              </div>
            </div>
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
              Chat with Charlie
            </h1>
            <p className="mt-2 font-body text-[15px] text-[var(--text-secondary)]">
              Check in, ask questions, or update your Progress Report.
            </p>
          </div>

          <div className="space-y-4">
            {MEETING_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => startMeeting(option.type)}
                  disabled={isStarting}
                  className="flex w-full items-center gap-5 rounded-xl border border-[var(--warm-200)] bg-white p-6 text-left transition-all hover:border-[var(--emerald)] hover:shadow-sm"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--emerald)]/10">
                    <Icon className="size-6 text-[var(--emerald)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                      {option.title}
                    </h3>
                    <p className="mt-1 font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {option.description}
                    </p>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-[var(--text-muted)]" />
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
              <p className="font-body text-[12px] leading-relaxed text-[var(--text-muted)]">
                All conversations are private and stored securely. Charlie provides
                educational information, not financial advice. Speak with a licensed
                financial advisor before implementing any changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active meeting
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--warm-200)] bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {meetingType === "annual-review" ? (
              <ClipboardList className="size-5 text-[var(--emerald)]" />
            ) : (
              <MessageCircle className="size-5 text-[var(--emerald)]" />
            )}
            <h2 className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
              {meetingType === "annual-review" ? "Check-in" : "Financial Q&A"}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetMeeting}
            className="flex items-center gap-2 rounded-lg border border-[var(--warm-200)] px-4 py-2 font-body text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--warm-100)]"
          >
            <RotateCcw className="size-3.5" />
            New Meeting
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] space-y-4 px-4 py-6">
          {messages.map((msg, i) => (
            <ConversationBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={isStreaming && msg.role === "assistant" && i === messages.length - 1}
            />
          ))}

          {sessionComplete && meetingType === "annual-review" && sessionId && (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--emerald)]/30 bg-[var(--emerald)]/5 px-4 py-3">
              <p className="font-body text-[13px] text-[var(--text-secondary)]">
                Your check-in conversation is complete.
                {hasReviewExtract
                  ? " Review the updates Charlie captured, then apply them to your profile — a new Progress Report will be generated."
                  : " If Charlie captured structured updates, confirm them on the next step."}
              </p>
              <Link
                href={`/dashboard/meeting/${sessionId}/apply-changes`}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-[13px] font-semibold text-white hover:bg-[var(--emerald-dark)]"
              >
                Review changes Charlie noted
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--warm-200)] bg-white">
        <div className="mx-auto flex min-w-0 max-w-[720px] items-end gap-3 px-4 py-4">
          <textarea
            ref={textareaRef}
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={sessionComplete ? "Meeting complete" : "Type your message..."}
            disabled={isStreaming || !sessionId || sessionComplete}
            rows={1}
            className="min-w-0 flex-1 resize-none rounded-xl border border-[var(--warm-200)] bg-white px-4 py-2.5 font-body text-[15px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={isStreaming || !inputValue.trim() || !sessionId || sessionComplete}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)] text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-40"
          >
            {isStreaming ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowRight className="size-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
