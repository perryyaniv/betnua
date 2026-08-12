import { useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import BottomNav from './BottomNav';
import InstallPrompt from '../InstallPrompt';
import { getNavTabs, getActiveTabPath } from './navTabs';

const SWIPE_MIN_DISTANCE = 60;

function isInsideHorizontalScroller(el: EventTarget | null): boolean {
  let node = el instanceof HTMLElement ? el : null;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number; skip: boolean } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, skip: isInsideHorizontalScroller(e.target) };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.skip || window.innerWidth >= 768) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const tabs = getNavTabs(user?.role);
    const currentIndex = tabs.indexOf(getActiveTabPath(location.pathname, tabs) ?? '');
    if (currentIndex === -1) return;

    const nextIndex = dx > 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < tabs.length) {
      navigate(tabs[nextIndex]);
    }
  };

  return (
    <div
      className="min-h-dvh bg-bg font-sans flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-16">
        <InstallPrompt />
        <Outlet />
      </main>
      <footer className="hidden md:block fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <p className="text-xs text-white/60">© {new Date().getFullYear()} בתנועה</p>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
