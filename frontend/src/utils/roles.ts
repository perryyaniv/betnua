import { UserRole, User, Branch } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'מנהל',
  editor: 'עורך',
  viewer: 'צופה',
};

export function hasWriteAccess(role?: UserRole): boolean {
  return role === 'admin' || role === 'editor';
}

function idsOf(branchIds: string[] | Branch[]): string[] {
  return branchIds.map((b) => (typeof b === 'string' ? b : b._id));
}

/** UI-only convenience check — the server is the real authority on access. */
export function canSeeBranch(user: User | null, branchId?: string | null): boolean {
  if (!user) return false;
  if (user.role === 'admin' || !branchId) return true;
  return idsOf(user.branchIds).includes(branchId);
}
