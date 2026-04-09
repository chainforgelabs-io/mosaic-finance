export type UserRole = 'user' | 'admin';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  user: [
    'read:own_profile',
    'write:own_profile',
    'read:own_plans',
    'read:own_conversations',
    'write:own_conversations',
    'read:own_holdings',
    'write:own_holdings',
  ],
  admin: [
    'read:own_profile',
    'write:own_profile',
    'read:own_plans',
    'read:own_conversations',
    'write:own_conversations',
    'read:own_holdings',
    'write:own_holdings',
    'read:approval_queue',
    'write:approval_queue',
    'read:all_plans',
    'write:plan_review',
    'read:all_users',
    'write:user_roles',
    'read:analytics',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessApprovalQueue(role: UserRole): boolean {
  return hasPermission(role, 'read:approval_queue');
}

export function canReviewPlan(role: UserRole): boolean {
  return hasPermission(role, 'write:plan_review');
}

export function canReadAllPlans(role: UserRole): boolean {
  return hasPermission(role, 'read:all_plans');
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'write:user_roles');
}

export function isValidRole(role: string): role is UserRole {
  return ['user', 'admin'].includes(role);
}
