'use client';

import React, { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Next.js's default production overlay ("Application error: a client-side
// exception has occurred") deliberately hides the real error and only logs
// it to the browser console. This boundary shows the actual message on the
// page itself, so a crash is diagnosable from a phone screenshot alone.
export default function PublicAppError({ error, reset }: Props): React.ReactElement {
  useEffect(() => {
    // Still log it too, in case devtools are available.
    // eslint-disable-next-line no-console
    console.error('Public app error boundary caught:', error);
  }, [error]);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        This page hit an unexpected error. The details below will help fix it.
      </p>
      <pre style={{
        textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: '#f5f5f0', border: '1px solid #ddd', borderRadius: 8,
        padding: 16, fontSize: 13, marginBottom: 20,
      }}>
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
      </pre>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button type="button" onClick={() => reset()}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1b3a2f', color: '#fff', cursor: 'pointer' }}>
          Try again
        </button>
        <a href="/" style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', color: 'inherit', textDecoration: 'none' }}>
          Go home
        </a>
      </div>
    </div>
  );
}
