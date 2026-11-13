import { addDays, startOfWeekMonday } from "@/lib/tracking/dates";

export const LOOP_EVENTS = [
  "signup",
  "first_log",
  "log_week_2",
  "snapshot_saved",
  "fact_find_started",
  "fact_find_completed",
  "checkout_started",
] as const;

export type LoopEvent = (typeof LOOP_EVENTS)[number];

/** Events for one new log, given activity dates from before that log. */
export function loopEventsForLog(input: {
  signupOn: string;
  loggedOn: string;
  priorLogDates: string[];
}): Array<"first_log" | "log_week_2"> {
  const events: Array<"first_log" | "log_week_2"> = [];
  const prior = input.priorLogDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  if (prior.length === 0) events.push("first_log");

  const weekTwo = addDays(startOfWeekMonday(input.signupOn), 7);
  const loggedWeek = startOfWeekMonday(input.loggedOn);
  const alreadyLoggedWeekTwo = prior.some((date) => startOfWeekMonday(date) === weekTwo);
  if (loggedWeek === weekTwo && !alreadyLoggedWeekTwo) events.push("log_week_2");
  return events;
}

export function secondsSinceSignup(signupAt: string, now: Date): number {
  const started = Date.parse(signupAt);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.round((now.getTime() - started) / 1000));
}
