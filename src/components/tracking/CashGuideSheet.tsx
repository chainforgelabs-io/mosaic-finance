"use client";

import { useState } from "react";

const STEPS = [
  {
    title: "Start with the bank balance",
    body: "Enter the balance in the account your pay lands in, as of today. Pay increases that balance. Purchases from that account reduce it.",
  },
  {
    title: "List income, expenses, and savings",
    body: "The plan is one row for each source. Enter the amount each time, or a full-year figure and how often it is paid. Weekly, every 2 weeks, twice a month, monthly, every 6 months, and yearly are all available.",
  },
  {
    title: "Say whether a purchase left the bank",
    body: "When you log a purchase, choose From the bank or On a card. A card purchase counts as spending and does not reduce the bank balance. Uploaded card statements work the same way.",
  },
  {
    title: "Pay the card from the bank",
    body: "When money leaves the bank to pay a credit card or a line of credit, choose Pay the card. That payment is not counted as spending again. You can also enter one number for what you owe on cards and lines of credit, and update it when you check your bank balance.",
  },
] as const;

export function CashGuideSheet({
  onClose,
  onSetup,
}: {
  onClose: () => void;
  onSetup?: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <p className="font-body text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          How tracking works · {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">{current.title}</h2>
        <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">{current.body}</p>
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
              onClick={onSetup ?? onClose}
              className="flex-1 cursor-pointer rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
            >
              {onSetup ? "Set up my plan" : "Got it"}
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
