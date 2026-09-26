import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Missed-scan detection: a cron that never fires can't log its own absence,
 * so the nightly labeler reconstructs yesterday's expected schedule (from
 * the vercel.json cron specs) and alarms when no scan_runs heartbeat lands
 * near that slot. Heartbeats are matched within SCAN_SLOT_MATCH_MS because
 * Vercel delivers crons late and older rows were rounded to a 30-minute
 * boundary, which made an on-time-enough 07:00 scan look missing.
 * Scan continuity is what makes the dataset's baselines trustworthy.
 */

/** A heartbeat this close to an expected slot counts as that slot. */
export const SCAN_SLOT_MATCH_MS = 45 * 60_000;

/** Mirror of vercel.json: "0 18 * * 1-5" and "0 7 * * *". */
export function expectedSlotsForUtcDay(dayStartUtc: Date): string[] {
  const slots: string[] = [];
  const day = dayStartUtc.getUTCDay();

  const nightly = new Date(dayStartUtc);
  nightly.setUTCHours(7, 0, 0, 0);
  slots.push(nightly.toISOString());

  if (day >= 1 && day <= 5) {
    const slot = new Date(dayStartUtc);
    slot.setUTCHours(18, 0, 0, 0);
    slots.push(slot.toISOString());
  }
  return slots;
}

/**
 * UTC instant a cron invocation is supposed to cover. Picks the scheduled
 * hour closest to `now`, so a start at 07:20 still records 07:00.
 */
export function intendedScanSlot(
  kind: "nightly" | "intraday",
  now = new Date(),
): string {
  const hour = kind === "nightly" ? 7 : 18;
  let best = "";
  let bestDelta = Infinity;
  for (const offset of [-1, 0, 1]) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    candidate.setUTCHours(hour, 0, 0, 0);
    const delta = Math.abs(candidate.getTime() - now.getTime());
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate.toISOString();
    }
  }
  return best;
}

/** Expected slots with no observed heartbeat inside the match window. */
export function missedScheduledSlots(
  expected: string[],
  observed: string[],
  toleranceMs = SCAN_SLOT_MATCH_MS,
): string[] {
  return expected.filter((slot) => {
    const at = new Date(slot).getTime();
    return !observed.some(
      (seen) => Math.abs(new Date(seen).getTime() - at) <= toleranceMs,
    );
  });
}

export async function detectMissedScans(): Promise<{
  expected: number;
  missed: string[];
  observed: string[];
}> {
  const supabase = createServiceClient();

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  dayStart.setUTCDate(dayStart.getUTCDate() - 1);
  const dayEnd = new Date(dayStart.getTime() + 86400_000);

  const expected = expectedSlotsForUtcDay(dayStart);

  const { data, error } = await supabase
    .from("scan_runs")
    .select("scheduled_for")
    .gte("scheduled_for", dayStart.toISOString())
    .lt("scheduled_for", dayEnd.toISOString());
  if (error) throw error;

  const observed = (data || [])
    .filter((r) => r.scheduled_for)
    .map((r) => new Date(r.scheduled_for as string).toISOString());
  const missed = missedScheduledSlots(expected, observed);

  if (missed.length > 0) {
    Sentry.captureMessage("Missed scheduled scans — dataset continuity gap", {
      level: "warning",
      extra: {
        day: dayStart.toISOString().slice(0, 10),
        expected: expected.length,
        missedSlots: missed,
        observedSlots: observed,
      },
    });
  }

  return { expected: expected.length, missed, observed };
}
