"use client";

interface ConversationBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ConversationBubble({ role, content, isStreaming }: ConversationBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-[var(--slate-950)] text-white px-4 py-3 rounded-2xl rounded-br-md">
          <p className="font-[family-name:var(--font-body)] text-[15px] leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)]" />
          <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)]">
            finova ai
          </span>
        </div>
        <div className="bg-white border border-[var(--warm-200)] px-4 py-3 rounded-2xl rounded-bl-md">
          <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
            {content}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-[var(--emerald)] ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)]" />
          <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)]">
            finova ai
          </span>
        </div>
        <div className="bg-white border border-[var(--warm-200)] px-4 py-3 rounded-2xl rounded-bl-md">
          <div className="flex items-center gap-1.5 h-5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[var(--emerald)]"
                style={{
                  animation: `pulse-dot 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
