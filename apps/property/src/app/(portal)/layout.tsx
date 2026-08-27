'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useSession,
  useSessionLoading,
  useSessionContext,
  performLogout,
} from '@stayos/auth';
import {
  SocketProvider,
  MandateBanner,
  SkeletonLoader,
  filterNav,
  Icons,
} from '@stayos/ui';
import type { NavItem } from '@stayos/ui';
import { ACCESS_MODE } from '@stayos/constants';
import { propertyNav } from '@/lib/nav-config';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';

const SOCKET_URL =
  process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3000';

const AGENCY_PORTAL_URL =
  process.env['NEXT_PUBLIC_AGENCY_PORTAL_URL'] ?? 'https://agency.stayos.co.za';

function isItemActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

// Two-letter initials from a snake_case role string e.g. property_admin → PA
function roleInitials(role: string): string {
  return role
    .split('_')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const session        = useSession();
  const isLoading      = useSessionLoading();
  const { clearSession } = useSessionContext();
  const router         = useRouter();
  const pathname       = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar whenever the route changes (mobile tap-to-navigate)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Property name for the header — fetched once, cached 5 min
  const { data: property } = useQuery({
    queryKey: ['tenants', 'me'],
    queryFn: () =>
      api.tenants.getMe() as unknown as Promise<{ name: string }>,
    enabled: !!session,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <SkeletonLoader rows={1} />;
  if (!session)  return <></>;

  const visibleNav = filterNav(propertyNav, session);
  const isReadOnly = session.accessMode === ACCESS_MODE.READ_ONLY;

  async function handleLogout(): Promise<void> {
    clearSession();
    await performLogout({
      onDisconnect: () => {},
      onNavigate:   () => router.replace('/login'),
    });
  }

  function renderNavItem(item: NavItem): React.ReactElement {
    // Group header — label only, recurse into children
    if (!item.path && item.children?.length) {
      return (
        <li key={item.id}>
          <span data-nav-group-label>{item.label}</span>
          <ul>{item.children.map((child) => renderNavItem(child))}</ul>
        </li>
      );
    }

    const active = item.path ? isItemActive(pathname, item.path) : false;
    const Icon   = item.icon;

    return (
      <li key={item.id}>
        <Link
          href={item.path ?? '#'}
          data-nav-item
          data-nav-id={item.id}
          data-active={active ? 'true' : 'false'}
        >
          {Icon && <Icon data-nav-icon width={18} height={18} aria-hidden="true" />}
          <span data-nav-label>{item.label}</span>
        </Link>
      </li>
    );
  }

  return (
    <SocketProvider serverUrl={SOCKET_URL}>
      <div data-portal-layout>

        {/* ── Mobile overlay — closes sidebar on tap ─────────────────── */}
        {sidebarOpen && (
          <div
            data-sidebar-overlay
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <nav
          data-sidebar
          data-open={sidebarOpen ? 'true' : 'false'}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <div data-sidebar-logo>
            <Icons.Building2 aria-hidden="true" />
            <div data-sidebar-brand>
              <span data-brand-name>StayOS</span>
              <span data-brand-sub>Property Portal</span>
            </div>
          </div>

          {/* Nav tree */}
          <ul data-nav-list>
            {visibleNav.map((item) => renderNavItem(item))}
          </ul>

          {/* Footer */}
          <div data-sidebar-footer>
            {/* Agency staff indicator */}
            {session.isAgencyStaffInProperty && (
              <>
                <span data-agency-badge>Managed by agency</span>
                <a href={AGENCY_PORTAL_URL} data-back-to-agency>
                  <Icons.ArrowLeftRight width={14} height={14} aria-hidden="true" />
                  Back to Agency Dashboard
                </a>
              </>
            )}

            {/* User row */}
            <div data-sidebar-user>
              <div data-user-avatar aria-hidden="true">
                {roleInitials(session.role)}
              </div>
              <span data-user-role>
                {session.role.replace(/_/g, ' ')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              data-logout-btn
              aria-label="Log out"
            >
              <Icons.LogOut width={16} height={16} aria-hidden="true" />
              Log out
            </button>
          </div>
        </nav>

        {/* ── Main ──────────────────────────────────────────────────── */}
        <main data-portal-main>

          {/* Mandate banners — persistent, non-dismissible */}
          {isReadOnly && <MandateBanner />}

          {/* Sticky header */}
          <header data-portal-header>
            <div data-header-left>
              <button
                type="button"
                data-hamburger
                onClick={() => setSidebarOpen((o) => !o)}
                aria-label="Toggle navigation"
                aria-expanded={sidebarOpen}
              >
                <Icons.Menu width={20} height={20} aria-hidden="true" />
              </button>
              <span data-header-property-name>
                {property?.name ?? 'Property Portal'}
              </span>
            </div>

            <div data-header-right>
              <div data-header-avatar aria-hidden="true">
                {roleInitials(session.role)}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div data-portal-content>
            {children}
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
