import { addDays, addMonths, monthKey, startOfMonth, startOfWeekMonday } from "@/lib/tracking/dates";

export function computeWeeklyStreak(
  txnDates: string[],
  today: string,
): { current: number; loggedThisWeek: boolean } {
  const weeks = new Set(txnDates.map(startOfWeekMonday));
  const thisWeek = startOfWeekMonday(today);
  const loggedThisWeek = weeks.has(thisWeek);
  let cursor = loggedThisWeek ? thisWeek : addDays(thisWeek, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return { current: streak, loggedThisWeek };
}

export function computeMonthlyStreak(
  snapshotDates: string[],
  today: string,
): { current: number; snapshottedThisMonth: boolean } {
  const months = new Set(snapshotDates.map(monthKey));
  const thisMonth = monthKey(today);
  const snapshottedThisMonth = months.has(thisMonth);
  let cursor = snapshottedThisMonth ? startOfMonth(today) : addMonths(today, -1);
  let streak = 0;
  while (months.has(monthKey(cursor))) {
    streak += 1;
    cursor = addMonths(cursor, -1);
  }
  return { current: streak, snapshottedThisMonth };
}
