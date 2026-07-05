import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Missed-scan detection: a cron that never fires can't log its own absence,
 * so the nightly labeler reconstructs yesterday's expected schedule (from
 * the vercel.json cron specs) and alarms on any slot with no scan_runs
 * heartbeat — including light-mode skips, which DO write heartbeats.
 * Scan continuity is what makes the dataset's baselines trustworthy.
 */

/** Mirror of vercel.json: "*​/30 13-21 * * 1-5" and "0 7 * * *". */
export function expectedSlotsForUtcDay(dayStartUtc: Date): string[] {
  const slots: string[] = [];
  const day = dayStartUtc.getUTCDay();

  const nightly = new Date(dayStartUtc);
  nightly.setUTCHours(7, 0, 0, 0);
  slots.push(nightly.toISOString());

  if (day >= 1 && day <= 5) {
    for (let hour = 13; hour <= 21; hour++) {
      for (const minute of [0, 30]) {
        const slot = new Date(dayStartUtc);
        slot.setUTCHours(hour, minute, 0, 0);
        slots.push(slot.toISOString());
      }
    }
  }
  return slots;
}

export async function detectMissedScans(): Promise<{
  expected: number;
  missed: string[];
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

  const seen = new Set(
    (data || [])
      .filter((r) => r.scheduled_for)
      .map((r) => new Date(r.scheduled_for as string).toISOString()),
  );
  const missed = expected.filter((slot) => !seen.has(slot));

  if (missed.length > 0) {
    Sentry.captureMessage("Missed scheduled scans — dataset continuity gap", {
      level: "warning",
      extra: {
        day: dayStart.toISOString().slice(0, 10),
        expected: expected.length,
        missedSlots: missed,
      },
    });
  }

  return { expected: expected.length, missed };
}
