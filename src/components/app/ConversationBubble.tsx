"use client";

import type { ReactNode } from "react";
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

export function CharlieChatSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#E8F7F0_0%,#F7FBFA_88px,#FFFFFF_200px)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CharlieChatHeader({
  subtitle = "AI money guide · Mosaic Finance",
  trailing,
}: {
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[var(--warm-200)] bg-white px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)] font-display text-sm font-semibold text-white">
        C
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
          Charlie
        </p>
        <p className="truncate font-body text-[11px] leading-tight text-[var(--text-muted)]">
          {subtitle}
        </p>
      </div>
      {trailing}
      <img
        src="/logos/MosaicEmblemLogo.png"
        alt=""
        className="h-7 w-auto shrink-0"
      />
    </div>
  );
}

export const charlieInputClass =
  "min-w-0 flex-1 resize-none rounded-2xl border border-[var(--warm-200)] bg-white px-4 py-2.5 font-body text-base leading-snug text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20 disabled:opacity-50";

export const charlieSendClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)] text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-30";

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
      <div className={cn(isUser ? "max-w-[82%]" : "max-w-[94%] sm:max-w-[86%]")}>
        <div
          className={cn(
            "font-body text-[15px] leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-md bg-[#E7EDF2] px-4 py-2.5 text-[var(--text-primary)]"
              : "text-[var(--text-primary)]",
          )}
        >
          {showTypingIndicator ? (
            <TypingIndicator />
          ) : (
            <div
              className={cn(
                "max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-5 [&>ol]:pl-5",
                isUser && "[&>p]:mb-0",
              )}
            >
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
