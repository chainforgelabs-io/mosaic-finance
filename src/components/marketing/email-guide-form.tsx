"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { NotesOptIn } from "@/components/marketing/notes-opt-in";
import { waitlistSource } from "@/lib/marketing/waitlist-source";

export function EmailGuideForm({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "duplicate" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: waitlistSource(source, new URLSearchParams(window.location.search).get("utm_source")),
          newsletter_opt_in: notes,
        }),
      });
      const data = (await res.json()) as { error?: string; alreadySignedUp?: boolean };
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

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-xl border border-warm-200 bg-white p-5">
      <p className="font-display text-sm font-semibold text-text-primary">Email me the guide</p>
      <p className="mt-1 font-body text-sm leading-relaxed text-text-secondary">
        Your numbers stay in this browser. The email is the RRSP, TFSA, and FHSA guide, and it adds you to the list.
      </p>
      {status === "success" || status === "duplicate" ? (
        <p className="mt-3 font-body text-sm text-text-primary">
          {status === "duplicate"
            ? "You're already on the list. We'll send the guide to your email."
            : "The guide is in your inbox, and you're on the list."}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label htmlFor={`${source}-email`} className="sr-only">
              Email
            </label>
            <input
              id={`${source}-email`}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              disabled={status === "submitting"}
              className="min-h-[44px] flex-1 rounded-lg border border-warm-200 px-3 font-body text-sm text-text-primary"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-emerald px-5 font-display text-sm font-semibold text-white disabled:opacity-60"
            >
              {status === "submitting" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Send the guide
            </button>
          </div>
          <div className="mt-3">
            <NotesOptIn id={`${source}-notes`} checked={notes} onChange={setNotes} />
          </div>
        </>
      )}
      {status === "error" && errorMessage && (
        <p className="mt-2 font-body text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
