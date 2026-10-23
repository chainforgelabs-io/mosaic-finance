"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    title: "Your dashboard",
    body: "The Health Score, this week’s log, and your Progress Report live here. This is the picture after the conversation with Charlie. Educational information, not advice.",
  },
  {
    title: "Cash Flow next",
    body: "Put a number on each month for money in, expenses, and savings. Then log spending each week so tracking can compare against the plan.",
    href: "/dashboard/cash-flow",
    linkLabel: "Open Cash Flow",
  },
  {
    title: "Then Net Worth",
    body: "The accounts and property from the conversation are already here. Check them and save the first snapshot. Pick the day of the month you want a reminder.",
    href: "/dashboard/assets",
    linkLabel: "Open Net Worth",
  },
  {
    title: "Then Goals",
    body: "The goals from the conversation are listed. Edit an amount or date, or tap Looks right if they still match.",
    href: "/dashboard/goals",
    linkLabel: "Open Goals",
  },
  {
    title: "Charlie stays",
    body: "Ask Charlie about any of these numbers any time. The sidebar link is always there after this tour.",
  },
] as const;

export function AppTourSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  function finishOnCashFlow() {
    onClose();
    router.push("/dashboard/cash-flow");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl"
        role="dialog"
        aria-labelledby="app-tour-title"
      >
        <p className="font-body text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          How Mosaic works · {step + 1} of {STEPS.length}
        </p>
        <h2 id="app-tour-title" className="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">
          {current.title}
        </h2>
        <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">{current.body}</p>
        {"href" in current && current.href && (
          <Link
            href={current.href}
            onClick={onClose}
            className="mt-3 inline-flex font-display text-sm font-semibold text-[var(--emerald-dark)] underline"
          >
            {current.linkLabel}
          </Link>
        )}
        <div className="mt-4 flex gap-1">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={
                index === step
                  ? "h-1 flex-1 rounded-full bg-[var(--slate-950)]"
                  : "h-1 flex-1 rounded-full bg-[var(--warm-200)]"
              }
            />
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value - 1)}
              className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
            >
              Close
            </button>
          )}
          {last ? (
            <button
              type="button"
              onClick={finishOnCashFlow}
              className="flex-1 cursor-pointer rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
            >
              Start with Cash Flow
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((value) => value + 1)}
              className="flex-1 cursor-pointer rounded-lg bg-[var(--slate-950)] py-2.5 font-display text-sm font-semibold text-white"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
