import { UserRole } from '../../types';

export function getNavTabs(role?: UserRole): string[] {
  const tabs = ['/', '/courses', '/events'];
  if (role === 'admin') tabs.push('/settings');
  return tabs;
}

export function getActiveTabPath(pathname: string, tabs: string[]): string | undefined {
  if (pathname === '/') return '/';
  const match = tabs
    .filter((p) => p !== '/' && (pathname === p || pathname.startsWith(p + '/')))
    .sort((a, b) => b.length - a.length)[0];
  return match;
}
