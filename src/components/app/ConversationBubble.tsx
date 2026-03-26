"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ConversationBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block size-2 rounded-full bg-[var(--emerald)]"
          style={{
            animation: "pulse-dot 1s ease-in-out infinite",
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function ConversationBubble({
  role,
  content,
  isStreaming = false,
  className,
}: ConversationBubbleProps) {
  const isUser = role === "user";
  const showTypingIndicator = isStreaming && !content;

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div className={cn("max-w-[80%]", !isUser && "flex flex-col")}>
        {!isUser && (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="block size-1.5 rounded-full bg-[var(--emerald)]" />
            <span className="font-body text-[11px] text-[var(--text-muted)]">
              Charlie
            </span>
          </div>
        )}
        <div
          className={cn(
            "px-4 py-3 font-body text-[15px] leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-md bg-[var(--slate-950)] text-white"
              : "rounded-2xl rounded-bl-md border border-[var(--warm-200)] bg-white text-[var(--text-primary)]",
          )}
        >
          {showTypingIndicator ? (
            <TypingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
              <ReactMarkdown>{content}</ReactMarkdown>
              {isStreaming && content && (
                <span
                  className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-[var(--emerald)]"
                  style={{ animation: "blink-cursor 0.8s step-end infinite" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
