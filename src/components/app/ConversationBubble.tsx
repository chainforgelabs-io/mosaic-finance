"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface ConversationBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  className?: string;
}

function TypingIndicator() {
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
  const [displayedContent, setDisplayedContent] = useState("");
  const prevContentRef = useRef("");
  const isUser = role === "user";

  useEffect(() => {
    if (!isStreaming || isUser) {
      setDisplayedContent(content);
      return;
    }

    // SSE progressive rendering: as content prop grows, reveal new characters
    const prevLen = prevContentRef.current.length;
    const newChars = content.slice(prevLen);

    if (newChars.length === 0) {
      setDisplayedContent(content);
      return;
    }

    let charIndex = 0;
    setDisplayedContent(content.slice(0, prevLen));

    const interval = setInterval(() => {
      charIndex++;
      const nextContent = content.slice(0, prevLen + charIndex);
      setDisplayedContent(nextContent);

      if (charIndex >= newChars.length) {
        clearInterval(interval);
        prevContentRef.current = content;
      }
    }, 12);

    return () => clearInterval(interval);
  }, [content, isStreaming, isUser]);

  useEffect(() => {
    if (!isStreaming) {
      prevContentRef.current = "";
    }
  }, [isStreaming]);

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
              finova ai
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
            <span>
              {isUser ? content : displayedContent}
              {isStreaming && content && (
                <span
                  className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-[var(--emerald)]"
                  style={{ animation: "blink-cursor 0.8s step-end infinite" }}
                />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
