'use client';
import React from 'react';
import { useSessionLoading } from '@stayos/auth';

// SessionProvider strips the ?token= param and builds the session on mount.
// This page only needs to show a loading indicator while that happens.
export default function OAuthCallbackPage(): React.ReactElement {
  const isLoading = useSessionLoading();
  return (
    <div data-auth-page>
      <div data-auth-panel>
        <p>{isLoading ? 'Signing you in…' : 'Redirecting…'}</p>
      </div>
    </div>
  );
}
