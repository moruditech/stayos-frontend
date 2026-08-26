'use client';

import React from 'react';
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

const SOCKET_URL =
  process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3000';

// import.meta.env is a Vite-ism and does not exist under Next.js — this app
// is built with next build/next dev, so this must read from process.env
// (inlined at build time for NEXT_PUBLIC_* vars) instead.
const AGENCY_PORTAL_URL =
  process.env['NEXT_PUBLIC_AGENCY_PORTAL_URL'] ?? 'https://agency.stayos.co.za';

function isItemActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const session = useSession();
  const isLoading = useSessionLoading();
  const { clearSession } = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();

  // While session is resolving show nothing — middleware already redirected
  // unauthenticated users, so this window is brief (token decode only).
  if (isLoading) return <SkeletonLoader rows={1} />;
  if (!session) return <></>;

  const visibleNav = filterNav(propertyNav, session);

  async function handleLogout(): Promise<void> {
    clearSession();
    await performLogout({
      onDisconnect: () => {},
      onNavigate: () => router.replace('/login'),
    });
  }

  // Owner returning from a managed property (read-only mandate exists)
  const isReadOnly = session.accessMode === ACCESS_MODE.READ_ONLY;

  function renderNavItem(item: NavItem): React.ReactElement {
    // Group headers have children but no path of their own (see NavGroup in
    // nav-config.ts) — render a label, then recurse into the children.
    if (!item.path && item.children?.length) {
      return (
        <li key={item.id}>
          <span data-nav-group-label>{item.label}</span>
          <ul>
            {item.children.map((child) => renderNavItem(child))}
          </ul>
        </li>
      );
    }

    const active = item.path ? isItemActive(pathname, item.path) : false;
    const Icon = item.icon;

    return (
      <li key={item.id}>
        <Link
          href={item.path ?? '#'}
          data-nav-item
          data-nav-id={item.id}
          data-active={active ? 'true' : 'false'}
        >
          {Icon && <Icon data-nav-icon aria-hidden="true" />}
          <span data-nav-label>{item.label}</span>
        </Link>
      </li>
    );
  }

  return (
    <SocketProvider serverUrl={SOCKET_URL}>
      <div data-portal-layout>
        {/* ── Mandate banners (persistent, non-dismissible) ─────────────── */}
        {isReadOnly && <MandateBanner />}
        {/* MandateTerminationBanner shown when mandate is in termination_notice.
            mandateStatus is not in the session token — callers that need it
            fetch it via api.owner.getMandate() or api.agency.getMandate().
            The banner is conditionally mounted by the page that knows the
            mandate status (e.g. the dashboard or a mandate-detail page).
            It is NOT mounted here because the portal layout does not hold
            mandate-status state. */}

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <nav data-sidebar aria-label="Main navigation">
          <div data-sidebar-logo>
            <Icons.Building2 aria-hidden="true" />
            StayOS
          </div>

          <ul>{visibleNav.map((item) => renderNavItem(item))}</ul>

          <div data-sidebar-footer>
            {/* Agency staff indicator — display only, never a gating input */}
            {session.isAgencyStaffInProperty && (
              <>
                <span data-agency-badge>Managed by agency</span>
                <a href={AGENCY_PORTAL_URL} data-back-to-agency>
                  <Icons.ArrowLeftRight aria-hidden="true" />
                  Back to Agency Dashboard
                </a>
              </>
            )}
            <button type="button" onClick={() => void handleLogout()} data-logout-btn>
              <Icons.LogOut aria-hidden="true" />
              Log out
            </button>
          </div>
        </nav>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main data-portal-main>
          <div data-portal-content>{children}</div>
        </main>
      </div>
    </SocketProvider>
  );
}
