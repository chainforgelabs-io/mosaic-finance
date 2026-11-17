"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUp, Check, Paperclip } from "lucide-react";
import { DemoShell } from "@/components/marketing/demo-shell";
import {
  DISCOVERY_DEMO_ALT,
  DISCOVERY_DEMO_LABELS,
  DISCOVERY_DEMO_NOTE,
  DISCOVERY_DEMO_STEPS,
  DISCOVERY_DEMO_SUMMARY,
  DISCOVERY_DEMO_THREAD,
  DISCOVERY_DEMO_TIMELINE,
  discoveryDemoWordsShown,
  type DiscoveryDemoFrame,
  type DiscoveryDemoWord,
} from "@/lib/marketing/discovery-demo";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";

/**
 * Looping illustration of the discovery chat with Charlie: a greeting, two
 * replies, and the monthly picture read back to confirm. Not a real
 * conversation and not a user's data.
 */
export function DiscoveryDemo({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <DemoShell
      timeline={DISCOVERY_DEMO_TIMELINE}
      steps={DISCOVERY_DEMO_STEPS}
      alt={DISCOVERY_DEMO_ALT}
      note={DISCOVERY_DEMO_NOTE}
      tone={tone}
      className={className}
    >
      {(frame) => <DiscoveryScreen frame={frame} />}
    </DemoShell>
  );
}

function DiscoveryScreen({ frame }: { frame: DiscoveryDemoFrame }) {
  const summaryShown = frame.shown >= DISCOVERY_DEMO_THREAD.length;

  return (
    <div className="flex h-full flex-col">
      <Header stepsDone={frame.confirmed ? 2 : 1} />

      {/* Reversed column: the thread starts at the top, then stays pinned to the bottom once it is full. */}
      <div className="relative flex min-h-0 flex-1 flex-col-reverse overflow-hidden">
        <div className="mb-auto px-3 pb-2.5 pt-2.5">
          <p className="font-body text-[8.5px] font-medium uppercase tracking-[0.12em] text-text-muted">
            {DISCOVERY_DEMO_LABELS.thread}
          </p>
          {DISCOVERY_DEMO_THREAD.map((item, index) => {
            const open = frame.shown > index;
            return (
              <Collapse key={index} open={open}>
                {item.kind === "charlie" && (
                  <CharlieMessage
                    words={item.words}
                    shown={discoveryDemoWordsShown(frame, index)}
                    arriving={open && frame.streaming && index === frame.shown - 1}
                  />
                )}
                {item.kind === "user" && <UserMessage text={item.text} />}
                {item.kind === "gap" && <Gap text={item.text} />}
                {item.kind === "summary" && (
                  <SummaryCard pressed={frame.pressed === "confirm"} confirmed={frame.confirmed} />
                )}
              </Collapse>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-warm-50 to-warm-50/0" />
      </div>

      {/* The app puts the reply box away once the picture is ready to confirm. */}
      <Collapse open={!summaryShown}>
        <Composer draft={frame.draft} pressed={frame.pressed === "send"} />
      </Collapse>
    </div>
  );
}

/** Opens to its content's height, so the thread makes room instead of jumping. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid shrink-0 transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Header({ stepsDone }: { stepsDone: number }) {
  return (
    <div className="shrink-0 overflow-hidden border-b border-warm-200 px-3 pb-2 pt-3">
      <div className="flex items-center justify-center gap-1">
        {/* The same small file the site header uses, so it is already cached. */}
        <Image
          src="/logos/MosaicEmblemLogo-128.png"
          alt=""
          width={13}
          height={13}
          loading="eager"
          unoptimized
        />
        <span className="font-display text-[10px] font-bold lowercase leading-none tracking-tight text-text-primary">
          mosaic finance
        </span>
      </div>

      {/* The first steps of the app's stepper. The rest run off the edge. */}
      <div className="-mr-3 mt-2.5 flex items-start">
        {DISCOVERY_DEMO_LABELS.steps.map((label, index) => {
          const done = index < stepsDone;
          const current = index === stepsDone;
          return (
            <div key={label} className="flex flex-1 items-start">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full transition-colors duration-300",
                    done || current ? "bg-emerald" : "border-[1.5px] border-warm-200",
                  )}
                >
                  {done ? (
                    <Check className="size-2.5 text-white" strokeWidth={3} />
                  ) : current ? (
                    <span className="block size-1 rounded-full bg-white" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap font-body text-[8px] leading-none",
                    done || current ? "font-medium text-text-primary" : "text-text-muted",
                  )}
                >
                  {label}
                </span>
              </div>
              <span
                className={cn(
                  "mx-1 mt-[7px] h-[2px] flex-1 rounded-full transition-colors duration-300",
                  done ? "bg-emerald" : "bg-warm-200",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CharlieMessage({
  words,
  shown,
  arriving,
}: {
  words: readonly DiscoveryDemoWord[];
  shown: number;
  arriving: boolean;
}) {
  return (
    <div className="pt-2.5">
      <p className="mb-1 flex items-center gap-1 font-body text-[9px] leading-none text-text-muted">
        <span className="block size-1 rounded-full bg-emerald" />
        {DISCOVERY_DEMO_LABELS.charlie}
      </p>
      <div className="inline-block max-w-[90%] rounded-2xl border border-warm-200 bg-white px-3 py-2 font-body text-[11px] leading-[1.5] text-text-primary">
        {shown === 0 ? (
          arriving && <ThinkingDots />
        ) : (
          <>
            {words.slice(0, shown).map((word, index) => (
              <span key={index} className={word.bold ? "font-semibold" : undefined}>
                {word.text}{" "}
              </span>
            ))}
            {arriving && (
              <span
                className="inline-block h-[1.05em] w-[1.5px] translate-y-[2px] bg-emerald"
                style={{ animation: "blink-cursor 0.8s step-end infinite" }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex h-[16.5px] items-center gap-1">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="block size-1.5 rounded-full bg-emerald"
          style={{ animation: "pulse-dot 1s ease-in-out infinite", animationDelay: `${dot * 150}ms` }}
        />
      ))}
    </span>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end pt-2.5">
      <div className="max-w-[82%] rounded-2xl bg-slate-950 px-3 py-1.5 font-body text-[11px] leading-[1.5] text-white">
        {text}
      </div>
    </div>
  );
}

function Gap({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 pt-3">
      <span className="h-px flex-1 bg-warm-200" />
      <span className="font-body text-[9px] leading-none text-text-muted">{text}</span>
      <span className="h-px flex-1 bg-warm-200" />
    </div>
  );
}

const SUMMARY_ROWS = (["income", "expenses", "savings"] as const).map((key) => ({
  label: DISCOVERY_DEMO_LABELS.summaryRows[key],
  value: `${formatMoney(DISCOVERY_DEMO_SUMMARY[key])}${DISCOVERY_DEMO_LABELS.perMonth}`,
}));

function SummaryCard({ pressed, confirmed }: { pressed: boolean; confirmed: boolean }) {
  return (
    <div className="pt-2.5">
      <div className="rounded-xl border-2 border-emerald bg-white p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald/10">
            <Check className="size-3 text-emerald" />
          </span>
          <p className="font-display text-[12px] font-semibold leading-none text-text-primary">
            {DISCOVERY_DEMO_LABELS.summaryTitle}
          </p>
        </div>
        <p className="mt-1.5 font-body text-[9.5px] leading-snug text-text-secondary">
          {DISCOVERY_DEMO_LABELS.summaryIntro}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {SUMMARY_ROWS.map((row) => (
            <div key={row.label} className="rounded-md bg-warm-50 px-1.5 py-1">
              <p className="font-body text-[7.5px] font-medium uppercase tracking-wider text-text-muted">
                {row.label}
              </p>
              <p className="mt-0.5 whitespace-nowrap font-body text-[10.5px] font-semibold leading-none tabular-nums text-text-primary">
                {row.value}
              </p>
            </div>
          ))}
        </div>
        <span
          className={cn(
            "mt-2 flex h-7 items-center justify-center gap-1 rounded-lg bg-emerald font-display text-[10.5px] font-semibold text-white transition-[transform,box-shadow] duration-200",
            pressed && "scale-[0.97] ring-4 ring-emerald/30",
          )}
        >
          {confirmed && <Check className="size-3" strokeWidth={3} />}
          {DISCOVERY_DEMO_LABELS.confirm}
        </span>
        <span className="mt-1 flex h-7 items-center justify-center rounded-lg border border-warm-200 font-display text-[10.5px] font-semibold text-text-primary">
          {DISCOVERY_DEMO_LABELS.correct}
        </span>
      </div>
    </div>
  );
}

function Composer({ draft, pressed }: { draft: string; pressed: boolean }) {
  return (
    <div className="flex items-center gap-1.5 border-t border-warm-200 bg-white px-2.5 py-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-warm-200">
        <Paperclip className="size-3 text-text-muted" />
      </span>
      <span className="flex h-7 min-w-0 flex-1 items-center rounded-xl border border-emerald px-2.5 font-body text-[11px] leading-none ring-2 ring-emerald/20">
        {draft ? (
          <>
            <span className="truncate text-text-primary">{draft}</span>
            <span
              className="ml-px inline-block h-3 w-[1.5px] shrink-0 bg-emerald"
              style={{ animation: "blink-cursor 0.8s step-end infinite" }}
            />
          </>
        ) : (
          <span className="truncate text-text-muted">{DISCOVERY_DEMO_LABELS.placeholder}</span>
        )}
      </span>
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald text-white transition-[transform,box-shadow,opacity] duration-200",
          !draft && "opacity-30",
          pressed && "scale-[0.92] ring-4 ring-emerald/30",
        )}
      >
        <ArrowUp className="size-3.5" />
      </span>
    </div>
  );
}
