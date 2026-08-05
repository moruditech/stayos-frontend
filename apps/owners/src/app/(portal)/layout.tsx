'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  useSession,
  useSessionLoading,
  useSessionContext,
  performLogout,
} from '@stayos/auth';
import { SocketProvider, SkeletonLoader } from '@stayos/ui';

const SOCKET_URL = process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3000';

// Owner Portal has no operational screens — the layout is minimal.
// Everything operational happens inside the Property Operations Portal
// after the token exchange via useEnterProperty. See Document 12 §7.
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const session = useSession();
  const isLoading = useSessionLoading();
  const { clearSession } = useSessionContext();
  const router = useRouter();

  if (isLoading) return <SkeletonLoader rows={1} />;
  if (!session) return <></>;

  async function handleLogout(): Promise<void> {
    clearSession();
    await performLogout({
      onDisconnect: () => {},
      onNavigate: () => router.replace('/login'),
    });
  }

  return (
    // Owner portal connects to /property namespace only when inside a
    // property (tenant-scoped token). The owner-scoped token connects to
    // no namespace — owner scope has no socket namespace defined (Document 05 §2).
    // SocketProvider handles this gracefully (returns null namespace → no connect).
    <SocketProvider serverUrl={SOCKET_URL}>
      <div data-portal-layout data-portal="owners">
        <header data-portal-header>
          <a href="/properties" data-logo>StayOS</a>
          <nav aria-label="Owner navigation">
            <a href="/properties" data-nav-item>My properties</a>
            <a href="/mandates" data-nav-item>Mandates</a>
            <a href="/profile" data-nav-item>Profile</a>
            <a href="/support" data-nav-item>Support</a>
          </nav>
          <button type="button" onClick={() => void handleLogout()} data-logout>
            Log out
          </button>
        </header>
        <main data-portal-main>{children}</main>
      </div>
    </SocketProvider>
  );
}
