import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PERMISSIONS } from '@stayos/constants';
import { useSession, performLogout } from '@stayos/auth';
import { filterNav, Icons } from '@stayos/ui';
import type { LucideIcon } from '@stayos/ui';
import { adminNav } from '../lib/nav-config';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accounts Team',
  support: 'Support Team',
  marketing: 'Marketing Team',
  vetting_officer: 'Vetting Team',
};

function initials(firstName?: string, lastName?: string, fallback?: string): string {
  if (firstName || lastName) return `${(firstName ?? '?')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase();
  return (fallback ?? 'P').slice(0, 2).toUpperCase();
}

export default function AppShell(): React.ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // GET /platform/users/:id requires platform:users:manage, which only
  // admin/super_admin hold — a real backend constraint, not an oversight
  // (Document 14 §5). Every other role (accountant, support, marketing,
  // vetting_officer) can't fetch their own profile through this route, so
  // the shell falls back to a role label rather than attempting a call that
  // 403s for most of this portal's users.
  const canSelfLookup =
    !!session && (session.permissions.includes(PERMISSIONS.PLATFORM_USERS_MANAGE) || session.permissions.includes(PERMISSIONS.WILDCARD));

  const { data: me } = useQuery({
    queryKey: ['platform', 'users', session?.userId],
    queryFn: () => api.platform.getUser(session!.userId),
    enabled: canSelfLookup,
    staleTime: 5 * 60_000,
  });

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: api.notifications.getUnreadCount,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const visibleSections = (session ? adminNav : [])
    .map((section) => ({ ...section, items: filterNav(section.items, session!) }))
    .filter((section) => section.items.length > 0);

  const roleLabel = session ? ROLE_LABELS[session.role] ?? session.role : '';
  const displayName = me ? `${me.firstName} ${me.lastName}` : roleLabel;

  const handleLogout = () => {
    void performLogout({
      onDisconnect: () => {},
      onNavigate: () => navigate('/login', { replace: true }),
    });
  };

  return (
    <div data-app-shell>
      <aside data-sidebar data-open={sidebarOpen}>
        <div data-sidebar-brand>
          <div data-brand-mark>
            <Icons.ShieldCheck size={18} />
          </div>
          <div>
            <div data-brand-name>StayOS</div>
            <div data-brand-subtitle>Platform Admin Portal</div>
          </div>
        </div>

        <nav data-sidebar-nav>
          {visibleSections.map((section) => (
            <React.Fragment key={section.label ?? 'root'}>
              {section.label ? <div data-nav-section-label>{section.label}</div> : null}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link key={item.id} to={item.path} data-nav-item data-active={isActive} onClick={() => setSidebarOpen(false)}>
                    <NavIcon id={item.id} />
                    {item.label}
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div data-sidebar-footer>
          <div data-system-status>
            <span data-system-status-label>
              <span data-status-dot /> All systems operational
            </span>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.2)' }} />
      ) : null}

      <div data-app-main>
        <header data-topbar>
          <button data-topbar-menu-toggle onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle menu">
            <Icons.Menu size={20} />
          </button>
          <label data-topbar-search>
            <Icons.Search />
            <input placeholder="Search tenants, agencies, users, tickets..." />
            <span data-topbar-search-kbd>⌘K</span>
          </label>

          <div data-topbar-actions>
            <button data-icon-button aria-label="Notifications">
              <Icons.Bell size={19} />
              {unread && unread.count > 0 ? <span data-notif-count>{unread.count > 99 ? '99+' : unread.count}</span> : null}
            </button>

            <div data-dropdown>
              <button data-user-menu onClick={() => setMenuOpen((v) => !v)}>
                <span data-avatar>{initials(me?.firstName, me?.lastName, session?.role)}</span>
                <span data-user-meta>
                  <div data-user-name>{displayName || '\u00A0'}</div>
                  <div data-user-role>{roleLabel}</div>
                </span>
                <Icons.ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
              {menuOpen ? (
                <div data-dropdown-menu onMouseLeave={() => setMenuOpen(false)}>
                  <button data-dropdown-item data-destructive onClick={handleLogout}>
                    <Icons.LogOut size={15} /> Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main data-app-content>
          <Outlet />
        </main>

        <footer data-app-footer>© {new Date().getFullYear()} StayOS. All rights reserved.</footer>
      </div>
    </div>
  );
}

function NavIcon({ id }: { id: string }): React.ReactElement {
  const map: Record<string, LucideIcon> = {
    dashboard: Icons.LayoutDashboard,
    tenants: Icons.Building2,
    agencies: Icons.Agency,
    analytics: Icons.BarChart3,
    revenue: Icons.TrendingUp,
    subscriptions: Icons.CreditCard,
    refunds: Icons.Banknote,
    users: Icons.UserCog,
    plans: Icons.Tag,
    coupons: Icons.Gift,
    referrals: Icons.Users,
    'audit-logs': Icons.ScrollText,
    'vetting-queue': Icons.ClipboardList,
    'all-applications': Icons.FileText,
    'support-tickets': Icons.LifeBuoy,
    'review-moderation': Icons.Star,
  };
  const Cmp = map[id] ?? Icons.Circle;
  return <Cmp size={17} />;
}
