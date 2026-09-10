import { createServiceClient } from "@/lib/supabase/service";

export const FOUNDING_CAP = Number(process.env.FOUNDING_CAP ?? 200);

export interface FoundingStatus {
  open: boolean;
  claimed: number;
  cap: number;
  remaining: number;
  deadline: string | null;
}

export function foundingDeadline(): Date | null {
  const raw = process.env.FOUNDING_DEADLINE;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isFoundingOpen(claimed: number, now = new Date()): boolean {
  if (claimed >= FOUNDING_CAP) return false;
  const deadline = foundingDeadline();
  if (deadline && now > deadline) return false;
  return true;
}

export async function getFoundingStatus(now = new Date()): Promise<FoundingStatus> {
  let claimed = 0;
  try {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_member", true);
    claimed = count ?? 0;
  } catch {
    claimed = 0;
  }

  const deadline = foundingDeadline();
  const open = isFoundingOpen(claimed, now);

  return {
    open,
    claimed,
    cap: FOUNDING_CAP,
    remaining: Math.max(0, FOUNDING_CAP - claimed),
    deadline: deadline?.toISOString() ?? null,
  };
}
