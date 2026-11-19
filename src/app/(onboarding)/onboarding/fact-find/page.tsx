import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingProgress } from "@/lib/actions/onboarding";
import { loadFactFindResume } from "@/lib/conversation/fact-find-session";
import { FactFindConversation } from "./fact-find-client";

export const dynamic = "force-dynamic";

export default async function FactFindPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const progress = await getOnboardingProgress();
    if (progress.factFindComplete && progress.resumePath !== "/onboarding/fact-find") {
      redirect(progress.resumePath);
    }
  }

  const initialResume = user ? await loadFactFindResume(supabase, user.id) : null;

  return (
    <div className="flex flex-1 flex-col">
      <FactFindConversation initialResume={initialResume} />
    </div>
  );
}
