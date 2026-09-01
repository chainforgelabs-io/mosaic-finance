/** Monday-start week helpers using calendar dates (YYYY-MM-DD), UTC-safe. */

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeekMonday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function weekRange(weekStart: string): { start: string; end: string } {
  return { start: weekStart, end: addDays(weekStart, 6) };
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function addMonths(isoDate: string, months: number): string {
  const [y, m] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${addDays(weekStart, 6)}T00:00:00`);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", opts)}`;
}

export function formatMonthLabel(isoDate: string): string {
  const date = new Date(`${startOfMonth(isoDate)}T00:00:00`);
  return date.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}
