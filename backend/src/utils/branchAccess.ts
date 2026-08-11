import { UserRole } from '../models/User';

export interface AccessUser {
  role: UserRole;
  branchIds: string[];
}

export function isAdmin(user: AccessUser): boolean {
  return user.role === 'admin';
}

/** null means "all branches" (admin). Otherwise the explicit list the user is assigned to. */
export function accessibleBranchIds(user: AccessUser): string[] | null {
  return isAdmin(user) ? null : user.branchIds.map(String);
}

/** Can this user see a resource belonging to `branchId` (null/undefined = studio-wide, visible to everyone)? */
export function canAccessBranch(user: AccessUser, branchId?: string | null): boolean {
  if (isAdmin(user) || !branchId) return true;
  return user.branchIds.map(String).includes(String(branchId));
}

/**
 * Can this user create/edit a resource for `branchId`?
 * Studio-wide (branchId falsy) writes are admin-only; branch-scoped writes require
 * editor/admin role AND assignment to that branch.
 */
export function canWriteBranch(user: AccessUser, branchId?: string | null): boolean {
  if (isAdmin(user)) return true;
  if (!branchId) return false;
  return user.role === 'editor' && user.branchIds.map(String).includes(String(branchId));
}
