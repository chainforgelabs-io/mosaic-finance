import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canAccessApprovalQueue,
  canReviewPlan,
  canReadAllPlans,
  canManageUsers,
  isValidRole,
  ROLE_PERMISSIONS,
  type UserRole,
} from '@/lib/auth/roles';

describe('Role-Based Access Control', () => {
  describe('isValidRole', () => {
    it('accepts "user"', () => {
      expect(isValidRole('user')).toBe(true);
    });

    it('accepts "admin"', () => {
      expect(isValidRole('admin')).toBe(true);
    });

    it('rejects legacy cim_reviewer', () => {
      expect(isValidRole('cim_reviewer')).toBe(false);
    });

    it('rejects unknown roles', () => {
      expect(isValidRole('moderator')).toBe(false);
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });
  });

  describe('User role permissions', () => {
    const role: UserRole = 'user';

    it('can read own profile', () => {
      expect(hasPermission(role, 'read:own_profile')).toBe(true);
    });

    it('can read own plans', () => {
      expect(hasPermission(role, 'read:own_plans')).toBe(true);
    });

    it('can manage own conversations', () => {
      expect(hasPermission(role, 'read:own_conversations')).toBe(true);
      expect(hasPermission(role, 'write:own_conversations')).toBe(true);
    });

    it('can manage own holdings', () => {
      expect(hasPermission(role, 'read:own_holdings')).toBe(true);
      expect(hasPermission(role, 'write:own_holdings')).toBe(true);
    });

    it('CANNOT access approval queue', () => {
      expect(hasPermission(role, 'read:approval_queue')).toBe(false);
      expect(canAccessApprovalQueue(role)).toBe(false);
    });

    it('CANNOT review plans', () => {
      expect(hasPermission(role, 'write:plan_review')).toBe(false);
      expect(canReviewPlan(role)).toBe(false);
    });

    it('CANNOT read all plans', () => {
      expect(canReadAllPlans(role)).toBe(false);
    });

    it('CANNOT manage users', () => {
      expect(canManageUsers(role)).toBe(false);
    });
  });

  describe('Admin role permissions', () => {
    const role: UserRole = 'admin';

    it('has all user permissions', () => {
      const userPerms = ROLE_PERMISSIONS['user'];
      for (const perm of userPerms) {
        expect(hasPermission(role, perm)).toBe(true);
      }
    });

    it('CAN access approval queue', () => {
      expect(canAccessApprovalQueue(role)).toBe(true);
    });

    it('CAN review plans', () => {
      expect(canReviewPlan(role)).toBe(true);
    });

    it('CAN read all plans for review', () => {
      expect(canReadAllPlans(role)).toBe(true);
    });

    it('CAN manage users', () => {
      expect(canManageUsers(role)).toBe(true);
    });

    it('CAN access analytics', () => {
      expect(hasPermission(role, 'read:analytics')).toBe(true);
    });
  });

  describe('Permission hierarchy', () => {
    it('admin has strictly more permissions than user', () => {
      const adminPerms = ROLE_PERMISSIONS['admin'];
      const userPerms = ROLE_PERMISSIONS['user'];
      for (const perm of userPerms) {
        expect(adminPerms).toContain(perm);
      }
      expect(adminPerms.length).toBeGreaterThan(userPerms.length);
    });
  });

  describe('hasPermission edge cases', () => {
    it('returns false for non-existent permission', () => {
      expect(hasPermission('admin', 'nonexistent:permission')).toBe(false);
    });

    it('returns false for empty permission string', () => {
      expect(hasPermission('user', '')).toBe(false);
    });
  });

  describe('Approval queue access — compliance critical', () => {
    it('only admin can access the queue', () => {
      expect(canAccessApprovalQueue('user')).toBe(false);
      expect(canAccessApprovalQueue('admin')).toBe(true);
    });

    it('only admin can approve/reject plans', () => {
      expect(canReviewPlan('user')).toBe(false);
      expect(canReviewPlan('admin')).toBe(true);
    });

    it('role field is independent of subscription tier (compliance requirement)', () => {
      const roles: UserRole[] = ['user', 'admin'];
      for (const role of roles) {
        expect(isValidRole(role)).toBe(true);
      }
      expect(isValidRole('free')).toBe(false);
      expect(isValidRole('essential')).toBe(false);
      expect(isValidRole('pro')).toBe(false);
      expect(isValidRole('premium')).toBe(false);
    });
  });
});
