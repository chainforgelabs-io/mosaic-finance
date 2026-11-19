import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractedFactFind,
  factFindSessionsToAbandon,
  pickFactFindSession,
  shouldShowFactFindSummary,
  type FactFindSessionRef,
} from "@/lib/conversation/fact-find-resume";

export interface FactFindResume {
  sessionId: string;
  status: string;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  summary: Record<string, unknown> | null;
  showSummary: boolean;
}

interface SessionRow {
  id: string;
  status: string;
  metadata: unknown;
  last_activity_at: string;
}

async function listFactFindSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<FactFindSessionRef[]> {
  const { data: sessions } = await supabase
    .from("conversation_sessions")
    .select("id, status, metadata, last_activity_at")
    .eq("user_id", userId)
    .eq("session_type", "fact-find")
    .neq("status", "abandoned")
    .order("last_activity_at", { ascending: false })
    .limit(8);

  const rows = (sessions ?? []) as SessionRow[];
  if (rows.length === 0) return [];

  const { data: messageRows } = await supabase
    .from("conversation_messages")
    .select("session_id")
    .in(
      "session_id",
      rows.map((row) => row.id),
    );

  const counts = new Map<string, number>();
  for (const row of messageRows ?? []) {
    const id = String((row as { session_id: string }).session_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    metadata: row.metadata,
    lastActivityAt: row.last_activity_at,
    messageCount: counts.get(row.id) ?? 0,
  }));
}

export async function resolveFactFindSession(
  supabase: SupabaseClient,
  userId: string,
  options?: { abandonRestarts?: boolean },
): Promise<FactFindSessionRef | null> {
  const sessions = await listFactFindSessions(supabase, userId);
  const picked = pickFactFindSession(sessions);
  if (picked && options?.abandonRestarts) {
    const extras = factFindSessionsToAbandon(sessions, picked);
    if (extras.length > 0) {
      await supabase
        .from("conversation_sessions")
        .update({ status: "abandoned" })
        .in("id", extras)
        .eq("user_id", userId);
    }
  }
  return picked;
}

export async function loadFactFindResume(
  supabase: SupabaseClient,
  userId: string,
): Promise<FactFindResume | null> {
  const session = await resolveFactFindSession(supabase, userId, { abandonRestarts: true });
  if (!session || (session.messageCount === 0 && !extractedFactFind(session.metadata))) {
    return session
      ? { sessionId: session.id, status: session.status, messages: [], summary: null, showSummary: false }
      : null;
  }

  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("id, role, content, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const visible = (messages ?? []).flatMap((message) => {
    if (
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.trim().length === 0
    ) {
      return [];
    }
    return [{ id: String(message.id), role: message.role, content: message.content }];
  });

  const summary = extractedFactFind(session.metadata);
  const last = visible[visible.length - 1];
  const showSummary = shouldShowFactFindSummary({
    status: session.status,
    hasExtracted: summary != null,
    lastMessageRole: last?.role ?? null,
    lastMessageContent: last?.content ?? "",
  });

  return {
    sessionId: session.id,
    status: session.status,
    messages: visible,
    summary: showSummary ? summary : null,
    showSummary,
  };
}
