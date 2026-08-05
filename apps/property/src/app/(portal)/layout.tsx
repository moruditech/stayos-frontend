'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  useSession,
  useSessionLoading,
  useSessionContext,
  performLogout,
} from '@stayos/auth';
import {
  SocketProvider,
  MandateBanner,
  MandateTerminationBanner,
  SkeletonLoader,
  filterNav,
  RoleGate,
} from '@stayos/ui';
import { ACCESS_MODE, MANDATE_STATUS } from '@stayos/constants';
import { propertyNav } from '@/lib/nav-config';

const SOCKET_URL =
  process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3000';
const PROPERTY_PORTAL_URL =
  process.env['NEXT_PUBLIC_PROPERTY_PORTAL_URL'] ?? 'https://app.stayos.co.za';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const session = useSession();
  const isLoading = useSessionLoading();
  const { clearSession } = useSessionContext();
  const router = useRouter();

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
  // mandateId on the session tells us a termination-notice check is relevant
  const hasMandate = !!session.mandateId;

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
        <nav data-portal-sidebar aria-label="Main navigation">
          {/* Agency staff indicator — display only, never a gating input */}
          {session.isAgencyStaffInProperty && (
            <a
              href={
                (import.meta as { env: Record<string, string> }).env?.[
                  'NEXT_PUBLIC_AGENCY_PORTAL_URL'
                ] ?? 'https://agency.stayos.co.za'
              }
              data-back-to-agency
            >
              ← Back to Agency Dashboard
            </a>
          )}

          <ul>
            {visibleNav.map((item) => (
              <li key={item.id}>
                <a href={item.path} data-nav-item data-nav-id={item.id}>
                  {item.label}
                </a>
                {item.children && (
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <a href={child.path} data-nav-item data-nav-id={child.id}>
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <button type="button" onClick={() => void handleLogout()} data-logout>
            Log out
          </button>
        </nav>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main data-portal-main>{children}</main>
      </div>
    </SocketProvider>
  );
}
