'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@stayos/api-client';
import type { LoginInput } from '@stayos/validators';
import type { ApiError } from '@stayos/api-client';

interface MfaStepProps {
  tempToken: string;
  loginValues: LoginInput;
  onSuccess: (accessToken: string) => void;
}

/**
 * MFA verification step — shared across all portal login pages.
 *
 * Displays the 60-second countdown (confirmed TTL from token.service.js),
 * disables the code input on expiry, and offers a resend action that
 * replaces the temp token without requiring the user to re-enter credentials.
 *
 * TOKEN_EXPIRED from the server is mapped to a specific message, not the
 * generic validation-error path — it's a session-lifecycle event, not a
 * field-level error (Document 06 §5.1 / Document 02 §4.1).
 */
export function MfaStep({ tempToken: initialTempToken, loginValues, onSuccess }: MfaStepProps): React.ReactElement {
  const [tempToken, setTempToken] = useState(initialTempToken);
  const [countdown, setCountdown] = useState(60);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleVerify(): Promise<void> {
    if (countdown <= 0) {
      setError('That code expired — request a new one.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.auth.mfaVerify({ tempToken, totpCode: code });
      onSuccess(result.accessToken);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr.code === 'TOKEN_EXPIRED'
          ? 'That code expired — request a new one.'
          : apiErr.message ?? 'Verification failed.'
      );
      setSubmitting(false);
    }
  }

  async function handleResend(): Promise<void> {
    setSubmitting(true);
    setError('');
    try {
      const result = await api.auth.login(loginValues);
      if (result.mfaRequired && result.tempToken) {
        setTempToken(result.tempToken);
        setCountdown(60);
        setCode('');
      }
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const expired = countdown <= 0;

  return (
    <div data-mfa-step>
      <h2>Two-factor verification</h2>
      <p>Enter the 6-digit code from your authenticator app.</p>

      <div data-mfa-countdown aria-live="polite" aria-atomic="true">
        {expired ? 'Code expired' : `Code expires in ${countdown}s`}
      </div>

      <input
        type="text"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        disabled={expired || submitting}
        placeholder="000000"
        aria-label="6-digit authentication code"
        data-mfa-input
        autoComplete="one-time-code"
      />

      {error && <span role="alert" data-form-error>{error}</span>}

      <button
        type="button"
        onClick={() => void handleVerify()}
        disabled={code.length !== 6 || submitting || expired}
        data-btn-primary
        data-btn-full
      >
        {submitting ? 'Verifying…' : 'Verify'}
      </button>

      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={submitting}
        data-btn-ghost
        data-btn-full
      >
        Resend code
      </button>
    </div>
  );
}
