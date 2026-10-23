import { monthKey } from "@/lib/tracking/dates";

/** Calendar date in America/Toronto as YYYY-MM-DD. */
export function torontoDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function clampReminderDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(28, Math.max(1, Math.round(day)));
}

/**
 * True once the chosen day of the month has arrived in America/Toronto
 * and no snapshot has been saved this month.
 */
export function reminderDue(input: {
  day: number;
  today: string;
  lastSnapshotDate: string | null;
}): boolean {
  const day = clampReminderDay(input.day);
  const datePart = input.today.slice(0, 10);
  const ofMonth = Number(datePart.slice(8, 10));
  if (!Number.isFinite(ofMonth) || ofMonth < day) return false;
  if (!input.lastSnapshotDate) return true;
  return monthKey(input.lastSnapshotDate) !== monthKey(datePart);
}

export function reminderDayLabel(day: number): string {
  const n = clampReminderDay(day);
  if (n === 1 || n === 21) return `${n}st`;
  if (n === 2 || n === 22) return `${n}nd`;
  if (n === 3 || n === 23) return `${n}rd`;
  return `${n}th`;
}
