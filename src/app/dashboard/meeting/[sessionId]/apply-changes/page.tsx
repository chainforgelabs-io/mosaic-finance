import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplyAnnualReviewForm } from "./ApplyAnnualReviewForm";

export default async function ApplyChangesPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("metadata, session_type, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    redirect("/dashboard/meeting");
  }

  if (session.session_type !== "annual-review") {
    redirect("/dashboard/meeting");
  }

  if (session.status !== "completed") {
    redirect("/dashboard/meeting");
  }

  const meta =
    session.metadata && typeof session.metadata === "object"
      ? (session.metadata as Record<string, unknown>)
      : {};

  if (meta.applied_at) {
    redirect("/dashboard");
  }

  const extracted = meta.extracted_data;
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) {
    redirect("/dashboard/meeting");
  }

  return (
    <ApplyAnnualReviewForm
      sessionId={sessionId}
      initialExtracted={extracted as Record<string, unknown>}
    />
  );
}
