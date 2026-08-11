import { isAdmin, accessibleBranchIds, canAccessBranch, canWriteBranch } from './branchAccess';

const admin = { role: 'admin' as const, branchIds: [] };
const editorA = { role: 'editor' as const, branchIds: ['branch-a'] };
const viewerA = { role: 'viewer' as const, branchIds: ['branch-a'] };

describe('isAdmin', () => {
  it('is true only for the admin role', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(editorA)).toBe(false);
  });
});

describe('accessibleBranchIds', () => {
  it('returns null (all branches) for admin', () => {
    expect(accessibleBranchIds(admin)).toBeNull();
  });

  it("returns the user's assigned branches otherwise", () => {
    expect(accessibleBranchIds(editorA)).toEqual(['branch-a']);
  });
});

describe('canAccessBranch', () => {
  it('lets admin access any branch', () => {
    expect(canAccessBranch(admin, 'branch-z')).toBe(true);
  });

  it('lets anyone access studio-wide (null branch) resources', () => {
    expect(canAccessBranch(viewerA, null)).toBe(true);
  });

  it('lets a scoped user access their assigned branch', () => {
    expect(canAccessBranch(viewerA, 'branch-a')).toBe(true);
  });

  it('blocks a scoped user from an unassigned branch', () => {
    expect(canAccessBranch(viewerA, 'branch-b')).toBe(false);
  });
});

describe('canWriteBranch', () => {
  it('lets admin write anywhere, including studio-wide', () => {
    expect(canWriteBranch(admin, null)).toBe(true);
    expect(canWriteBranch(admin, 'branch-a')).toBe(true);
  });

  it('blocks non-admins from writing studio-wide resources', () => {
    expect(canWriteBranch(editorA, null)).toBe(false);
  });

  it('lets an editor write within their assigned branch', () => {
    expect(canWriteBranch(editorA, 'branch-a')).toBe(true);
  });

  it('blocks an editor from writing outside their assigned branch', () => {
    expect(canWriteBranch(editorA, 'branch-b')).toBe(false);
  });

  it('blocks a viewer from writing anywhere', () => {
    expect(canWriteBranch(viewerA, 'branch-a')).toBe(false);
  });
});
