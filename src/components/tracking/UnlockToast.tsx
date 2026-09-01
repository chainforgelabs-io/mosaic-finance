"use client";

import { useEffect, useState } from "react";
import { Award, X } from "lucide-react";

export interface UnlockItem {
  key: string;
  name: string;
  description: string;
}

export function UnlockToast({
  unlocks,
  onDismiss,
}: {
  unlocks: UnlockItem[];
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(unlocks.length > 0);

  useEffect(() => {
    setVisible(unlocks.length > 0);
    if (unlocks.length === 0) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 6000);
    return () => window.clearTimeout(t);
  }, [unlocks, onDismiss]);

  if (!visible || unlocks.length === 0) return null;

  const first = unlocks[0];

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm md:bottom-6 md:left-auto md:right-6">
      <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--emerald-soft)]">
            <Award className="size-5 text-[var(--emerald-dark)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
              {first.name}
            </p>
            <p className="font-body text-xs text-[var(--text-secondary)]">{first.description}</p>
            {unlocks.length > 1 && (
              <p className="mt-1 font-body text-[11px] text-[var(--emerald-dark)]">
                +{unlocks.length - 1} more unlocked
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
