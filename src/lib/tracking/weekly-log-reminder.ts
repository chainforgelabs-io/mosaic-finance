export interface ReminderCandidate {
  id: string;
  remindersOn: boolean;
  sentFor: string | null;
  loggedThisWeek: boolean;
}

/** One email per Monday-start week, only when that week has no log. */
export function weeklyLogReminderIds(weekStart: string, people: ReminderCandidate[]): string[] {
  return people
    .filter((person) => person.remindersOn && !person.loggedThisWeek && person.sentFor !== weekStart)
    .map((person) => person.id);
}
