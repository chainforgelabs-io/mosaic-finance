"use client";

import { useEffect, useState } from "react";
import { Calendar, MessageCircle, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface MeetingSession {
  id: string;
  session_type: string;
  status: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  "fact-find": "Initial Consultation",
  "risk-profile": "Risk Assessment",
  "annual-review": "Annual Review",
  "ad-hoc": "Financial Q&A",
  walkthrough: "Plan Walkthrough",
  followup: "Follow-up",
};

export function MeetingHistory() {
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("conversation_sessions")
        .select("id, session_type, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setSessions(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
        <div className="skeleton h-6 w-40 mb-4" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[var(--emerald)]" />
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
            Meeting History
          </h3>
        </div>
        <Link
          href="/dashboard/meeting"
          className="font-body text-[13px] font-medium text-[var(--emerald)] hover:underline"
        >
          New Meeting
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="font-body text-[13px] text-[var(--text-muted)]">
          No meetings yet. Start your first AI meeting to see history here.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 rounded-lg bg-[var(--warm-50)] p-3"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-[var(--emerald)]/10">
                {session.session_type === "annual-review" ? (
                  <Calendar className="size-3.5 text-[var(--emerald)]" />
                ) : (
                  <MessageCircle className="size-3.5 text-[var(--emerald)]" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-body text-[13px] font-medium text-[var(--text-primary)]">
                  {TYPE_LABELS[session.session_type] ?? session.session_type}
                </p>
                <p className="font-body text-[11px] text-[var(--text-muted)]">
                  {new Date(session.created_at).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  <span
                    className={
                      session.status === "completed"
                        ? "text-[var(--emerald)]"
                        : "text-[var(--text-muted)]"
                    }
                  >
                    {session.status === "completed" ? "Completed" : "In Progress"}
                  </span>
                </p>
              </div>
              <ChevronRight className="size-4 text-[var(--text-muted)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
