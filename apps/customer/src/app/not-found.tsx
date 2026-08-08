'use client';

// This file is intentionally at the app/ root so it applies to every
// unmatched path — including portal paths that don't exist and bare
// paths the user may type directly into the address bar.
//
// Without this file Next.js renders its built-in 404, which still goes
// through app/layout.tsx (so SessionProvider runs), but the session
// bootstrap result is lost because nothing in the default 404 renders
// any authenticated UI or provides navigation back into the portal.
//
// With this file, an invalid URL:
//   1. Passes the middleware check (marker cookie is present — the user IS
//      logged in; the cookie just hasn't been consumed yet).
//   2. SessionProvider bootstraps, refresh succeeds (now that the proxy
//      fix is in place), session is set.
//   3. This page renders with a clear "page not found" message and
//      navigation options. The user is NOT logged out.

import React from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound(): React.ReactElement {
  const router = useRouter();

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100dvh',
        gap:            '1.25rem',
        padding:        '2rem',
        textAlign:      'center',
        background:     'var(--color-bg, #fafafa)',
        color:          'var(--color-text, #111)',
      }}
    >
      <p
        style={{
          fontSize:   'var(--text-5xl, 3rem)',
          fontWeight: 700,
          lineHeight: 1,
          margin:     0,
        }}
        aria-hidden="true"
      >
        404
      </p>

      <h1
        style={{
          fontSize:   'var(--text-2xl, 1.5rem)',
          fontWeight: 600,
          margin:     0,
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          fontSize: 'var(--text-base, 1rem)',
          color:    'var(--color-text-muted, #666)',
          maxWidth: '26rem',
          margin:   0,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding:      '0.625rem 1.25rem',
            border:       '1px solid var(--color-border, #e5e7eb)',
            borderRadius: 'var(--radius-md, 0.5rem)',
            background:   'transparent',
            color:        'var(--color-text, #111)',
            fontSize:     'var(--text-sm, 0.875rem)',
            cursor:       'pointer',
          }}
        >
          ← Go back
        </button>

        <button
          type="button"
          onClick={() => router.replace('/bookings')}
          style={{
            padding:      '0.625rem 1.25rem',
            border:       'none',
            borderRadius: 'var(--radius-md, 0.5rem)',
            background:   'var(--color-primary, #111)',
            color:        '#fff',
            fontSize:     'var(--text-sm, 0.875rem)',
            cursor:       'pointer',
          }}
        >
          My bookings
        </button>
      </div>
    </div>
  );
}
