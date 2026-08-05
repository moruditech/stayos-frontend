import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { useSession, performLogout } from '@stayos/auth';
import { filterNav, Icons } from '@stayos/ui';
import type { LucideIcon } from '@stayos/ui';
import { agencyNav } from '../lib/nav-config';
import { agencyKeys, agencyStaffKeys } from '../lib/query-keys';

const QUICK_ENTRY_LINKS = [
  { label: 'Onboard new property', path: '/properties/onboard', icon: Icons.Building2 },
  { label: 'Create mandate', path: '/mandates/new', icon: Icons.FileText },
  { label: 'Add staff member', path: '/staff/new', icon: Icons.UserPlus },
];

function initials(firstName?: string, lastName?: string): string {
  return `${(firstName ?? '?')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase();
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    agency_owner: 'Agency Owner',
    agency_manager: 'Agency Manager',
    agency_supervisor: 'Supervisor',
    agency_reservations: 'Reservations',
    agency_housekeeper: 'Housekeeper',
    agency_maintenance: 'Maintenance',
  };
  return labels[role] ?? role.replace(/_/g, ' ');
}

export default function AppShell(): React.ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const { data: agency } = useQuery({
    queryKey: agencyKeys.profile(),
    queryFn: api.agency.getMe,
    staleTime: 5 * 60_000,
  });

  const { data: me } = useQuery({
    queryKey: agencyStaffKeys.detail(session?.userId ?? ''),
    queryFn: () => api.agency.getStaff(session!.userId),
    enabled: !!session?.userId,
    staleTime: 5 * 60_000,
  });

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: api.notifications.getUnreadCount,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const visibleNav = session ? filterNav(agencyNav, session) : [];

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
            <Icons.Home size={18} />
          </div>
          <div>
            <div data-brand-name>StayOS</div>
            <div data-brand-subtitle>Agency Portal</div>
          </div>
        </div>

        <nav data-sidebar-nav>
          {visibleNav.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.id}
                to={item.path}
                data-nav-item
                data-active={isActive}
                onClick={() => setSidebarOpen(false)}
              >
                <NavIcon id={item.id} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div data-sidebar-footer>
          <div data-quick-entry>
            <div data-quick-entry-title>
              <Icons.Zap /> Quick entry
            </div>
            {QUICK_ENTRY_LINKS.map((link) => (
              <a
                key={link.label}
                data-quick-entry-link
                onClick={(e) => {
                  e.preventDefault();
                  navigate(link.path);
                }}
                href={link.path}
              >
                <link.icon /> {link.label}
              </a>
            ))}
          </div>
          <div data-system-status>
            <span data-system-status-label>
              <span data-status-dot /> All systems operational
            </span>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.2)' }}
        />
      ) : null}

      <div data-app-main>
        <header data-topbar>
          <button data-topbar-menu-toggle onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle menu">
            <Icons.Menu size={20} />
          </button>
          <label data-topbar-search>
            <Icons.Search />
            <input placeholder="Search properties, staff, mandates..." />
            <span data-topbar-search-kbd>⌘K</span>
          </label>

          <div data-topbar-actions>
            <button data-icon-button aria-label="Notifications">
              <Icons.Bell size={19} />
              {unread && unread.count > 0 ? <span data-notif-count>{unread.count > 99 ? '99+' : unread.count}</span> : null}
            </button>

            {agency ? (
              <div data-org-switcher>
                <Icons.Building2 size={16} />
                <span>{agency.name}</span>
              </div>
            ) : null}

            <div data-dropdown>
              <button data-user-menu onClick={() => setMenuOpen((v) => !v)}>
                <span data-avatar>{initials(me?.firstName, me?.lastName)}</span>
                <span data-user-meta>
                  <div data-user-name>{me ? `${me.firstName} ${me.lastName}` : '\u00A0'}</div>
                  <div data-user-role>{me ? roleLabel(me.role) : '\u00A0'}</div>
                </span>
                <Icons.ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
              {menuOpen ? (
                <div data-dropdown-menu onMouseLeave={() => setMenuOpen(false)}>
                  <button data-dropdown-item onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
                    <Icons.UserCog size={15} /> Agency profile
                  </button>
                  <button data-dropdown-item onClick={() => { setMenuOpen(false); navigate('/support'); }}>
                    <Icons.LifeBuoy size={15} /> Support
                  </button>
                  <div data-dropdown-divider />
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
    home: Icons.Home,
    portfolio: Icons.Briefcase,
    mandates: Icons.FileText,
    properties: Icons.Building2,
    staff: Icons.Users,
    statements: Icons.Receipt,
    billing: Icons.CreditCard,
    analytics: Icons.BarChart3,
    onboarding: Icons.ClipboardList,
    support: Icons.LifeBuoy,
  };
  const Cmp = map[id] ?? Icons.Circle;
  return <Cmp size={17} />;
}
