"use client";

import { useEffect, useState } from "react";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ReviewReminder() {
  const [isDue, setIsDue] = useState(false);
  const [daysSinceLastReview, setDaysSinceLastReview] = useState<number | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check next_review_date on user_profiles
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("next_review_date")
        .eq("id", user.id)
        .single();

      if (profile?.next_review_date) {
        const reviewDate = new Date(profile.next_review_date);
        if (reviewDate <= new Date()) {
          setIsDue(true);
        }
      }

      // Also check last annual review session
      const { data: lastReview } = await supabase
        .from("conversation_sessions")
        .select("created_at")
        .eq("user_id", user.id)
        .in("session_type", ["fact-find", "annual-review"])
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastReview) {
        const days = Math.floor(
          (Date.now() - new Date(lastReview.created_at).getTime()) / (1000 * 60 * 60 * 24),
        );
        setDaysSinceLastReview(days);
        if (days >= 330) {
          setIsDue(true);
        }
      }
    }
    check();
  }, []);

  if (!isDue) return null;

  return (
    <div className="rounded-lg border border-[var(--emerald)]/30 bg-[var(--emerald)]/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)]/10">
          <Calendar className="size-5 text-[var(--emerald)]" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
            Annual Check-in Due
          </h3>
          <p className="mt-1 font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {daysSinceLastReview !== null
              ? `It's been ${daysSinceLastReview} days since your last check-in. `
              : ""}
            Regular check-ins keep your Progress Report aligned with your life. Chat with Charlie
            to update your picture.
          </p>
          <Link
            href="/dashboard/meeting"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-5 py-2 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
          >
            Start Check-in
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
