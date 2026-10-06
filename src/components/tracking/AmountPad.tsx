"use client";

import { Delete } from "lucide-react";
import { formatAmountInput } from "@/lib/tracking/cash-capture";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export function AmountPad({
  digits,
  onDigitsChange,
}: {
  digits: string;
  onDigitsChange: (digits: string) => void;
}) {
  function press(key: string) {
    if (key === "back") {
      onDigitsChange(digits.slice(0, -1));
      return;
    }
    if (!key || digits.length >= 9) return;
    onDigitsChange(`${digits}${key}`);
  }

  return (
    <div>
      <p
        className="text-center font-display text-4xl font-bold tabular-nums text-[var(--text-primary)]"
        aria-live="polite"
      >
        ${formatAmountInput(digits)}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) =>
          key === "" ? (
            <span key="spacer" />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              aria-label={key === "back" ? "Delete digit" : key}
              className="flex h-14 items-center justify-center rounded-xl bg-[var(--warm-100)] font-display text-xl font-semibold text-[var(--text-primary)] active:bg-[var(--warm-200)]"
            >
              {key === "back" ? <Delete className="size-5" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
