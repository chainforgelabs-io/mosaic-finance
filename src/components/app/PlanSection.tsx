"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";

interface PlanSectionProps {
  title: string;
  status: "ai_generated" | "cim_reviewed";
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function PlanSection({
  title,
  status,
  children,
  defaultOpen = false,
  className,
}: PlanSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    defaultOpen ? undefined : 0,
  );

  useEffect(() => {
    if (!contentRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (isOpen) {
        setHeight(contentRef.current?.scrollHeight);
      }
    });
    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHeight(contentRef.current?.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--warm-200)] bg-white",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-6"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[22px] font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 font-body text-[11px] font-medium",
              status === "cim_reviewed"
                ? "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]"
                : "bg-[var(--warm-100)] text-[var(--text-muted)]",
            )}
          >
            {status === "cim_reviewed" ? "Professionally reviewed" : "AI Generated"}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-5 text-[var(--text-muted)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: height !== undefined ? `${height}px` : "auto" }}
      >
        <div ref={contentRef} className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
