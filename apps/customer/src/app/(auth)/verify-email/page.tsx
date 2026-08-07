'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';

// GET /auth/verify/:token — the token arrives as a query param from the
// emailed verification link. The backend verifies it and activates the account.
export default function VerifyEmailPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found in this link.');
      return;
    }
    api.auth.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: ApiError) => {
        setStatus('error');
        setErrorMessage(
          err.code === 'TOKEN_EXPIRED'
            ? 'This verification link has expired. Sign in to request a new one.'
            : err.message ?? 'Verification failed.'
        );
      });
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <p>Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <h1>Email verified</h1>
          <p>Your account is active. You can now sign in.</p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            data-btn-primary
            data-btn-full
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-auth-page>
      <div data-auth-panel>
        <h1>Verification failed</h1>
        <p>{errorMessage}</p>
        <a href="/login" data-btn-ghost data-btn-full>Back to sign in</a>
      </div>
    </div>
  );
}
