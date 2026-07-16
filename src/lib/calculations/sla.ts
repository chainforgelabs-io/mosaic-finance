/**
 * Approval-queue SLA helpers. Advisor tier gets an 8h priority deadline;
 * everyone else is on a 24h standard clock. Used for queue ordering and
 * reviewer warning badges — not user-facing countdown UI.
 */
export type SubscriptionTier = 'snapshot' | 'plan' | 'advisor';
export type QueuePriority = 'standard' | 'priority';

const SLA_HOURS: Record<QueuePriority, number> = {
  standard: 24,
  priority: 8,
};

const SLA_WARNING_THRESHOLD_HOURS = 4;

export function getSLAPriority(tier: SubscriptionTier): QueuePriority {
  return tier === 'advisor' ? 'priority' : 'standard';
}

export function calculateSLADeadline(
  submittedAt: Date,
  priority: QueuePriority,
): Date {
  const hours = SLA_HOURS[priority];
  return new Date(submittedAt.getTime() + hours * 60 * 60 * 1000);
}

export function getSLAHours(priority: QueuePriority): number {
  return SLA_HOURS[priority];
}

export function isSLABreached(deadline: Date, now: Date = new Date()): boolean {
  return now > deadline;
}

export function isSLAWarning(deadline: Date, now: Date = new Date()): boolean {
  const hoursRemaining =
    (deadline.getTime() - now.getTime()) / (60 * 60 * 1000);
  return hoursRemaining > 0 && hoursRemaining <= SLA_WARNING_THRESHOLD_HOURS;
}

export function getSLAStatus(
  deadline: Date,
  completedAt: Date | null,
  now: Date = new Date(),
): 'met' | 'breached' | 'warning' | 'pending' {
  if (completedAt) {
    return completedAt <= deadline ? 'met' : 'breached';
  }
  if (isSLABreached(deadline, now)) return 'breached';
  if (isSLAWarning(deadline, now)) return 'warning';
  return 'pending';
}
