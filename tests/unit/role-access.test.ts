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

    it('accepts "cim_reviewer"', () => {
      expect(isValidRole('cim_reviewer')).toBe(true);
    });

    it('accepts "admin"', () => {
      expect(isValidRole('admin')).toBe(true);
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

  describe('CIM Reviewer role permissions', () => {
    const role: UserRole = 'cim_reviewer';

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

    it('CANNOT manage users', () => {
      expect(canManageUsers(role)).toBe(false);
    });

    it('CANNOT access analytics', () => {
      expect(hasPermission(role, 'read:analytics')).toBe(false);
    });
  });

  describe('Admin role permissions', () => {
    const role: UserRole = 'admin';

    it('has all CIM reviewer permissions', () => {
      const reviewerPerms = ROLE_PERMISSIONS['cim_reviewer'];
      for (const perm of reviewerPerms) {
        expect(hasPermission(role, perm)).toBe(true);
      }
    });

    it('CAN manage users', () => {
      expect(canManageUsers(role)).toBe(true);
    });

    it('CAN access analytics', () => {
      expect(hasPermission(role, 'read:analytics')).toBe(true);
    });

    it('CAN access approval queue', () => {
      expect(canAccessApprovalQueue(role)).toBe(true);
    });

    it('CAN review plans', () => {
      expect(canReviewPlan(role)).toBe(true);
    });
  });

  describe('Permission hierarchy', () => {
    it('admin has strictly more permissions than cim_reviewer', () => {
      const adminPerms = ROLE_PERMISSIONS['admin'];
      const reviewerPerms = ROLE_PERMISSIONS['cim_reviewer'];
      for (const perm of reviewerPerms) {
        expect(adminPerms).toContain(perm);
      }
      expect(adminPerms.length).toBeGreaterThan(reviewerPerms.length);
    });

    it('cim_reviewer has strictly more permissions than user', () => {
      const reviewerPerms = ROLE_PERMISSIONS['cim_reviewer'];
      const userPerms = ROLE_PERMISSIONS['user'];
      for (const perm of userPerms) {
        expect(reviewerPerms).toContain(perm);
      }
      expect(reviewerPerms.length).toBeGreaterThan(userPerms.length);
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
    it('only cim_reviewer and admin can access the queue', () => {
      expect(canAccessApprovalQueue('user')).toBe(false);
      expect(canAccessApprovalQueue('cim_reviewer')).toBe(true);
      expect(canAccessApprovalQueue('admin')).toBe(true);
    });

    it('only cim_reviewer and admin can approve/reject plans', () => {
      expect(canReviewPlan('user')).toBe(false);
      expect(canReviewPlan('cim_reviewer')).toBe(true);
      expect(canReviewPlan('admin')).toBe(true);
    });

    it('role field is independent of subscription tier (compliance requirement)', () => {
      // This test documents the architectural decision: role != subscription_tier
      // A cim_reviewer can also have a subscription for testing
      const roles: UserRole[] = ['user', 'cim_reviewer', 'admin'];
      for (const role of roles) {
        expect(isValidRole(role)).toBe(true);
      }
      // Subscription tiers are NOT valid roles
      expect(isValidRole('free')).toBe(false);
      expect(isValidRole('essential')).toBe(false);
      expect(isValidRole('pro')).toBe(false);
      expect(isValidRole('premium')).toBe(false);
    });
  });
});
