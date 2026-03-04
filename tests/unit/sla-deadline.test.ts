import { describe, it, expect } from 'vitest';
import {
  calculateSLADeadline,
  getSLAPriority,
  getSLAHours,
  isSLABreached,
  isSLAWarning,
  getSLAStatus,
  type SubscriptionTier,
  type QueuePriority,
} from '@/lib/calculations/sla';

describe('SLA Deadline Calculation', () => {
  const baseTime = new Date('2026-03-04T12:00:00Z');

  describe('getSLAPriority', () => {
    it('premium tier gets priority queue', () => {
      expect(getSLAPriority('premium')).toBe('priority');
    });

    it('pro tier gets standard queue', () => {
      expect(getSLAPriority('pro')).toBe('standard');
    });

    it('essential tier gets standard queue', () => {
      expect(getSLAPriority('essential')).toBe('standard');
    });

    it('free tier gets standard queue', () => {
      expect(getSLAPriority('free')).toBe('standard');
    });

    it.each<[SubscriptionTier, QueuePriority]>([
      ['free', 'standard'],
      ['essential', 'standard'],
      ['pro', 'standard'],
      ['premium', 'priority'],
    ])('tier "%s" maps to "%s" priority', (tier, expected) => {
      expect(getSLAPriority(tier)).toBe(expected);
    });
  });

  describe('getSLAHours', () => {
    it('standard SLA is 24 hours', () => {
      expect(getSLAHours('standard')).toBe(24);
    });

    it('priority SLA is 8 hours', () => {
      expect(getSLAHours('priority')).toBe(8);
    });
  });

  describe('calculateSLADeadline', () => {
    it('adds 24 hours for standard priority', () => {
      const deadline = calculateSLADeadline(baseTime, 'standard');
      const expected = new Date('2026-03-05T12:00:00Z');
      expect(deadline.getTime()).toBe(expected.getTime());
    });

    it('adds 8 hours for priority (premium)', () => {
      const deadline = calculateSLADeadline(baseTime, 'priority');
      const expected = new Date('2026-03-04T20:00:00Z');
      expect(deadline.getTime()).toBe(expected.getTime());
    });

    it('handles midnight rollover correctly', () => {
      const lateSubmission = new Date('2026-03-04T23:00:00Z');
      const deadline = calculateSLADeadline(lateSubmission, 'priority');
      expect(deadline.getTime()).toBe(new Date('2026-03-05T07:00:00Z').getTime());
    });

    it('deadline is always after submission time', () => {
      const deadline = calculateSLADeadline(baseTime, 'standard');
      expect(deadline.getTime()).toBeGreaterThan(baseTime.getTime());
    });
  });

  describe('isSLABreached', () => {
    it('returns false before deadline', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-05T11:00:00Z');
      expect(isSLABreached(deadline, now)).toBe(false);
    });

    it('returns false exactly at deadline', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      expect(isSLABreached(deadline, deadline)).toBe(false);
    });

    it('returns true after deadline', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-05T12:00:01Z');
      expect(isSLABreached(deadline, now)).toBe(true);
    });

    it('returns true when well past deadline', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-06T12:00:00Z');
      expect(isSLABreached(deadline, now)).toBe(true);
    });
  });

  describe('isSLAWarning', () => {
    it('returns true within 4 hours of deadline', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-05T09:00:00Z');
      expect(isSLAWarning(deadline, now)).toBe(true);
    });

    it('returns false when more than 4 hours remain', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-05T07:00:00Z');
      expect(isSLAWarning(deadline, now)).toBe(false);
    });

    it('returns false after deadline (breached, not warning)', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-05T13:00:00Z');
      expect(isSLAWarning(deadline, now)).toBe(false);
    });

    it('returns true at exactly 4 hours before deadline', () => {
      const deadline = new Date('2026-03-05T12:00:00Z');
      const now = new Date('2026-03-05T08:00:00Z');
      expect(isSLAWarning(deadline, now)).toBe(true);
    });
  });

  describe('getSLAStatus', () => {
    const deadline = new Date('2026-03-05T12:00:00Z');

    it('returns "met" when completed before deadline', () => {
      const completedAt = new Date('2026-03-05T10:00:00Z');
      expect(getSLAStatus(deadline, completedAt)).toBe('met');
    });

    it('returns "met" when completed exactly at deadline', () => {
      const completedAt = new Date('2026-03-05T12:00:00Z');
      expect(getSLAStatus(deadline, completedAt)).toBe('met');
    });

    it('returns "breached" when completed after deadline', () => {
      const completedAt = new Date('2026-03-05T14:00:00Z');
      expect(getSLAStatus(deadline, completedAt)).toBe('breached');
    });

    it('returns "pending" when not completed and time remains', () => {
      const now = new Date('2026-03-04T12:00:00Z');
      expect(getSLAStatus(deadline, null, now)).toBe('pending');
    });

    it('returns "warning" when not completed and <4 hours remain', () => {
      const now = new Date('2026-03-05T09:00:00Z');
      expect(getSLAStatus(deadline, null, now)).toBe('warning');
    });

    it('returns "breached" when not completed and past deadline', () => {
      const now = new Date('2026-03-05T14:00:00Z');
      expect(getSLAStatus(deadline, null, now)).toBe('breached');
    });
  });

  describe('end-to-end SLA workflow', () => {
    it('premium user: submit → 8hr deadline → status tracking', () => {
      const submittedAt = new Date('2026-03-04T14:00:00Z');
      const priority = getSLAPriority('premium');
      expect(priority).toBe('priority');

      const deadline = calculateSLADeadline(submittedAt, priority);
      expect(deadline.getTime()).toBe(new Date('2026-03-04T22:00:00Z').getTime());

      // 6 hours later — warning zone
      const warningTime = new Date('2026-03-04T19:00:00Z');
      expect(getSLAStatus(deadline, null, warningTime)).toBe('warning');

      // Completed in time
      const completedAt = new Date('2026-03-04T21:00:00Z');
      expect(getSLAStatus(deadline, completedAt)).toBe('met');
    });

    it('standard user: submit → 24hr deadline → SLA breach', () => {
      const submittedAt = new Date('2026-03-04T14:00:00Z');
      const priority = getSLAPriority('pro');
      expect(priority).toBe('standard');

      const deadline = calculateSLADeadline(submittedAt, priority);
      expect(deadline.getTime()).toBe(new Date('2026-03-05T14:00:00Z').getTime());

      // 25 hours later — breached
      const breachTime = new Date('2026-03-05T15:00:00Z');
      expect(getSLAStatus(deadline, null, breachTime)).toBe('breached');
    });
  });
});
