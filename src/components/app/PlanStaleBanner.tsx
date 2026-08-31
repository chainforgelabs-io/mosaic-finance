"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";

type StalenessPayload = {
  stale: boolean;
  generating?: boolean;
  dataChangedAt: string | null;
  planUpdatedAt: string | null;
  planStatus: string | null;
};

export function PlanStaleBanner() {
  const [staleness, setStaleness] = useState<StalenessPayload | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plan/staleness", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as StalenessPayload;
        if (!cancelled) setStaleness(data);
      } catch {
        if (!cancelled) setStaleness(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegenerate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/plan/regenerate", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(
          typeof body.error === "string"
            ? body.error
            : "Could not start Progress Report regeneration.",
        );
        return;
      }
      setDismissed(true);
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  if (dismissed || staleness == null || !staleness.stale) {
    return null;
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--emerald)]/40 bg-emerald-50/90 px-4 py-3">
      <RefreshCw className="mt-0.5 size-5 shrink-0 text-[var(--emerald)]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
            Your financial data has changed
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-md p-1 text-[var(--text-muted)] hover:bg-white/80 hover:text-[var(--text-primary)]"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 font-body text-[13px] text-[var(--text-secondary)]">
          It looks newer than your last Progress Report. Regenerate to refresh
          your report with the latest numbers.
        </p>
        {error && (
          <p className="mt-2 font-body text-[13px] text-[var(--error)]">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {loading ? "Starting…" : "Regenerate report"}
        </button>
      </div>
    </div>
  );
}
