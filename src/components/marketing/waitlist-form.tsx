"use client";

import { useState, type FormEvent } from "react";
import { PROVINCES } from "@/lib/constants/provinces";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type WaitlistFormVariant = "hero" | "section" | "page";

const inputBase =
  "w-full rounded-lg border border-white/15 bg-white px-4 py-3 font-body text-sm text-slate-950 placeholder:text-slate-400 shadow-sm focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30";

export function WaitlistForm({
  source,
  variant = "hero",
  className,
}: {
  source: string;
  variant?: WaitlistFormVariant;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "duplicate" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          province: province || undefined,
          source,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        alreadySignedUp?: boolean;
      };
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong");
        return;
      }
      if (data.alreadySignedUp) {
        setStatus("duplicate");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  const isWide = variant === "page";
  const successBody =
    status === "duplicate"
      ? "You're already on the list — we'll email you when early access opens."
      : "We'll let you know when early access opens.";

  if (status === "success" || status === "duplicate") {
    return (
      <div
        className={cn(
          "rounded-xl border border-emerald/30 bg-emerald/10 px-6 py-5 text-left",
          isWide && "max-w-xl mx-auto",
          className,
        )}
      >
        <p className="font-display text-sm font-semibold text-emerald">
          {status === "duplicate" ? "You're already on the list" : "You're on the list"}
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
          {successBody}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(isWide && "mx-auto w-full max-w-xl", className)}>
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex w-full flex-col gap-3",
          variant === "section" && "items-stretch",
          variant === "page" && "gap-4",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1 text-left">
          <label htmlFor={`waitlist-email-${source}`} className="sr-only">
            Email
          </label>
          <input
            id={`waitlist-email-${source}`}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className={inputBase}
            disabled={status === "submitting"}
          />
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch",
            variant === "hero" && "sm:justify-center",
          )}
        >
          <div className="min-w-0 flex-1 text-left sm:max-w-[240px]">
            <label htmlFor={`waitlist-province-${source}`} className="sr-only">
              Province or territory
            </label>
            <select
              id={`waitlist-province-${source}`}
              name="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={cn(inputBase, "cursor-pointer appearance-none bg-white")}
              disabled={status === "submitting"}
            >
              <option value="">Province (optional)</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald px-8 py-3 font-display text-sm font-semibold text-white transition-colors hover:bg-emerald-dark disabled:opacity-60",
              variant === "section" && "w-full sm:w-auto sm:self-end",
              variant === "page" && "w-full py-3.5 sm:w-auto sm:self-end",
            )}
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Joining…
              </>
            ) : (
              "Join the waitlist"
            )}
          </button>
        </div>
      </form>

      {status === "error" && errorMessage && (
        <p className="mt-3 text-left font-body text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
