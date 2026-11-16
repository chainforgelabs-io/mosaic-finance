"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { NotesOptIn } from "@/components/marketing/notes-opt-in";
import { waitlistSource } from "@/lib/marketing/waitlist-source";

export function GuideLeadForm() {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState(false);
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
          source: waitlistSource("guide", new URLSearchParams(window.location.search).get("utm_source")),
          newsletter_opt_in: notes,
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
      setStatus(data.alreadySignedUp ? "duplicate" : "success");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  if (status === "success" || status === "duplicate") {
    return (
      <div className="rounded-xl border border-emerald/30 bg-emerald/10 px-6 py-5 text-left">
        <p className="font-display text-sm font-semibold text-emerald">
          {status === "duplicate" ? "You\u2019re already on the list" : "Check your inbox"}
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
          {status === "duplicate"
            ? "You\u2019re already on the list. We\u2019ll send the guide to your email."
            : "The guide is in your inbox, and you\u2019re on the list."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px]">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label htmlFor="guide-email" className="sr-only">Email</label>
        <input
          id="guide-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={status === "submitting"}
          className="min-h-[48px] flex-1 rounded-lg border border-white/15 bg-slate-900/80 px-4 py-3 font-body text-sm text-white placeholder:text-slate-500 shadow-sm focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald px-6 font-display text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-dark disabled:opacity-60 sm:px-8"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Send the guide"
          )}
        </button>
      </form>
      <div className="mt-3 text-left">
        <NotesOptIn id="guide-notes" checked={notes} onChange={setNotes} tone="dark" />
      </div>
      {status === "error" && errorMessage && (
        <p className="mt-3 text-center font-body text-sm text-red-400 sm:text-left" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
