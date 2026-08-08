'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, useSessionContext, performLogout, useSessionLoading } from '@stayos/auth';
import { SocketProvider, Icons } from '@stayos/ui';
import { api } from '@stayos/api-client';

const SOCKET_URL = process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3000';
const STUDENT_ROLES = new Set(['student_self_paying', 'student_bursary']);

const NAV_ITEMS = [
  { id: 'home',          label: 'Home',         path: '/',              icon: Icons.Home },
  { id: 'accommodation', label: 'Accommodation', path: '/accommodation', icon: Icons.Search },
  { id: 'bookings',      label: 'Bookings',      path: '/bookings',      icon: Icons.Calendar },
  { id: 'applications',  label: 'Applications',  path: '/applications',  icon: Icons.GraduationCap },
  { id: 'payments',      label: 'Payments',      path: '/payments',      icon: Icons.CreditCard },
  { id: 'invoices',      label: 'Invoices',      path: '/invoices',      icon: Icons.FileText, studentOnly: true },
  { id: 'leases',        label: 'Leases',        path: '/leases',        icon: Icons.ClipboardList, studentOnly: true },
  { id: 'loyalty',       label: 'Loyalty',       path: '/loyalty',       icon: Icons.Star },
  { id: '_div',          label: '',              path: '',               icon: undefined, divider: true },
  { id: 'wishlist',      label: 'Wishlist',      path: '/wishlist',      icon: Icons.Heart },
  { id: 'reviews',       label: 'Reviews',       path: '/reviews',       icon: Icons.MessageSquareText },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Icons.Bell, showBadge: true },
  { id: 'support',       label: 'Support',       path: '/support',       icon: Icons.Headphones },
  { id: 'profile',       label: 'Profile',       path: '/profile',       icon: Icons.User },
  { id: 'settings',      label: 'Settings',      path: '/settings',      icon: Icons.Settings },
] as const;

export default function PortalLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const session   = useSession();
  const isLoading = useSessionLoading();
  const { clearSession } = useSessionContext();
  const router    = useRouter();
  const pathname  = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Fetch unread count
  useEffect(() => {
    if (!session) return;
    api.notifications.getUnreadCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});
  }, [session]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSidebar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeSidebar]);

  // Redirect unauthenticated visitors to /login once the session check settles
  useEffect(() => {
    if (!isLoading && !session) router.replace('/login');
  }, [isLoading, session, router]);

  if (isLoading) return <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }} />;
  if (!session) return <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }} />;

  const isStudent   = STUDENT_ROLES.has(session.role);
  const firstLetter = session.userId[0]?.toUpperCase() ?? 'G';

  function isActive(path: string): boolean {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  }

  function navigate(path: string): void {
    router.push(path);
    closeSidebar();
  }

  async function handleLogout(): Promise<void> {
    clearSession();
    closeSidebar();
    await performLogout({
      onDisconnect: () => {},
      onNavigate:   () => router.replace('/login'),
    });
  }

  return (
    <SocketProvider serverUrl={SOCKET_URL}>
      <div data-portal-layout data-portal="customer">

        {/* Mobile/tablet header */}
        <header data-portal-header>
          <button
            type="button"
            data-hamburger
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <span /><span /><span />
          </button>

          <a href="/" data-logo>
            <span data-logo-wordmark>Stay<span data-logo-accent>OS</span></span>
            <span data-logo-sub>Guest Portal</span>
          </a>

          <div data-header-actions>
            <a href="/notifications" data-notif-button aria-label="Notifications">
              <Icons.Bell size={20} />
              {unreadCount > 0 && (
                <span data-notif-count aria-hidden="true">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </a>
            <a href="/profile" data-avatar-placeholder aria-label="Profile">
              {firstLetter}
            </a>
          </div>
        </header>

        {/* Overlay */}
        <div
          data-sidebar-overlay
          data-open={sidebarOpen ? '' : undefined}
          onClick={closeSidebar}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
          data-portal-sidebar
          data-open={sidebarOpen ? '' : undefined}
          aria-label="Main navigation"
        >
          <div data-sidebar-header>
            <a href="/" data-logo>
              <span data-logo-wordmark>Stay<span data-logo-accent>OS</span></span>
              <span data-logo-sub>Guest Portal</span>
            </a>
            <button type="button" data-sidebar-close onClick={closeSidebar} aria-label="Close navigation">
              <Icons.X size={18} />
            </button>
          </div>

          <nav data-sidebar-nav>
            {NAV_ITEMS.map((item) => {
              if ('divider' in item && item.divider) {
                return <div key={item.id} data-sidebar-nav-divider />;
              }
              if ('studentOnly' in item && item.studentOnly && !isStudent) return null;
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-nav-item
                  data-active={isActive(item.path) ? '' : undefined}
                  onClick={() => navigate(item.path)}
                >
                  <span data-nav-icon aria-hidden="true">{ItemIcon && <ItemIcon size={18} />}</span>
                  {item.label}
                  {'showBadge' in item && item.showBadge && unreadCount > 0 && (
                    <span data-nav-badge>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div data-sidebar-footer>
            <button type="button" data-sidebar-help onClick={() => navigate('/support')}>
              <span data-support-callout-icon aria-hidden="true"><Icons.Headphones size={18} /></span>
              <div data-sidebar-help-text>
                <strong>Need help?</strong>
                <span>We&apos;re here for you</span>
              </div>
              <Icons.ChevronRight size={16} aria-hidden="true" style={{ marginLeft: 'auto' }} />
            </button>
            <button type="button" data-sign-out-btn onClick={() => void handleLogout()}>
              <Icons.LogOut size={16} aria-hidden="true" />Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main data-portal-main>{children}</main>
      </div>
    </SocketProvider>
  );
}
