'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import { useSessionContext, useSessionLoading } from '@stayos/auth';
import { loginSchema } from '@stayos/validators';
import { InlineError, applyServerErrors } from '@stayos/ui';
import type { LoginInput } from '@stayos/validators';
import type { ApiError } from '@stayos/api-client';

function LoginPageInner(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useSessionContext();
  const isLoading = useSessionLoading();

  const [showPassword, setShowPassword] = useState(false);
  const [mfaState, setMfaState] = useState<{
    required: boolean;
    tempToken: string;
    countdown: number;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', userType: 'property', rememberMe: false },
  });

  // ── MFA countdown timer ────────────────────────────────────────────────────
  // The MFA temp token TTL is 60 seconds (confirmed — token.service.js expiresIn: '1m').
  // The countdown gives the user a visible window; on expiry the code input is
  // disabled and "Resend code" requests a fresh temp token.
  useEffect(() => {
    if (!mfaState?.required) return;
    if (mfaState.countdown <= 0) return;
    const timer = setTimeout(() => {
      setMfaState((s) => s ? { ...s, countdown: s.countdown - 1 } : null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [mfaState]);

  // ── Login submit ───────────────────────────────────────────────────────────
  async function handleLogin(values: LoginInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      const result = await api.auth.login(values);

      if (result.mfaRequired && result.tempToken) {
        setMfaState({ required: true, tempToken: result.tempToken, countdown: 60 });
        setSubmitting(false);
        return;
      }

      await setSession(result.accessToken);
      router.replace(redirect);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, apiErr);
      } else {
        setFormError(apiErr.message ?? 'Sign-in failed. Please try again.');
      }
      setSubmitting(false);
    }
  }

  // ── MFA submit ─────────────────────────────────────────────────────────────
  async function handleMfaSubmit(): Promise<void> {
    if (!mfaState) return;
    setSubmitting(true);
    setMfaError('');

    // Token expired client-side — tell the user before wasting a round trip
    if (mfaState.countdown <= 0) {
      setMfaError('That code expired — request a new one.');
      setSubmitting(false);
      return;
    }

    try {
      const result = await api.auth.mfaVerify({
        tempToken: mfaState.tempToken,
        totpCode: mfaCode,
      });
      await setSession(result.accessToken);
      router.replace(redirect);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'TOKEN_EXPIRED') {
        setMfaError('That code expired — request a new one.');
      } else {
        setMfaError(apiErr.message ?? 'Verification failed.');
      }
      setSubmitting(false);
    }
  }

  // ── MFA resend ─────────────────────────────────────────────────────────────
  async function handleMfaResend(): Promise<void> {
    setSubmitting(true);
    setMfaError('');
    try {
      const values = form.getValues();
      const result = await api.auth.login(values);
      if (result.mfaRequired && result.tempToken) {
        setMfaState({ required: true, tempToken: result.tempToken, countdown: 60 });
        setMfaCode('');
      }
    } catch {
      setMfaError('Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <></>;

  // ── MFA step ───────────────────────────────────────────────────────────────
  if (mfaState?.required) {
    return (
      <div data-login-page data-step="mfa">
        <div data-login-panel>
          <h1>Two-factor verification</h1>
          <p>Enter the 6-digit code from your authenticator app.</p>

          <div data-mfa-countdown aria-live="polite">
            {mfaState.countdown > 0
              ? `Code expires in ${mfaState.countdown}s`
              : 'Code expired'}
          </div>

          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            disabled={mfaState.countdown <= 0 || submitting}
            placeholder="000000"
            aria-label="6-digit authentication code"
            data-mfa-input
          />

          {mfaError && <span role="alert" data-form-error>{mfaError}</span>}

          <button
            type="button"
            onClick={() => void handleMfaSubmit()}
            disabled={mfaCode.length !== 6 || submitting || mfaState.countdown <= 0}
            data-btn-primary
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => void handleMfaResend()}
            disabled={submitting}
            data-btn-ghost
          >
            Resend code
          </button>
        </div>
      </div>
    );
  }

  // ── Main login ─────────────────────────────────────────────────────────────
  return (
    <div data-login-page data-portal="property">
      {/* Left panel — value proposition */}
      <div data-login-left>
        <div data-login-portal-label>
          <span data-portal-icon aria-hidden="true" />
          PROPERTY OPERATIONS PORTAL
        </div>

        <h1>
          Welcome back,{' '}
          <span data-login-headline-accent>
            let&apos;s continue managing your property.
          </span>
        </h1>

        <p data-login-subtitle>
          Sign in to access your dashboard, manage bookings, rooms, staff,
          housekeeping, maintenance and more.
        </p>

        <ul data-login-features>
          {[
            { label: 'Manage bookings', detail: 'View, confirm and manage reservations across all your channels.' },
            { label: 'Room & rates control', detail: 'Update availability, rates, restrictions and room settings in real time.' },
            { label: 'Housekeeping & maintenance', detail: 'Track tasks, assign staff and keep every area guest-ready.' },
            { label: 'Staff & roles', detail: 'Manage your team, permissions and schedules with ease.' },
            { label: 'Reports & insights', detail: 'Monitor performance and make data-driven decisions.' },
          ].map((f) => (
            <li key={f.label} data-login-feature>
              <span data-feature-icon aria-hidden="true" />
              <div>
                <strong>{f.label}</strong>
                <span>{f.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — form */}
      <div data-login-right>
        <form
          onSubmit={form.handleSubmit((v) => void handleLogin(v))}
          data-login-form
          noValidate
        >
          <div data-form-group>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            <InlineError message={form.formState.errors.email?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="password">Password</label>
            <div data-input-with-suffix>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-password-toggle
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <InlineError message={form.formState.errors.password?.message} />
          </div>

          <div data-form-row>
            <label data-checkbox-label>
              <input type="checkbox" {...form.register('rememberMe')} />
              Remember me
            </label>
            <a href="/forgot-password" data-link>
              Forgot password?
            </a>
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <button
            type="submit"
            disabled={submitting}
            data-btn-primary
            data-btn-full
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div data-divider><span>or continue with</span></div>

          {/* Google OAuth — the only OAuth provider confirmed on the backend.
              Microsoft, Apple, etc. are NOT implemented. Do not add them. */}
          <a
            href={api.auth.googleLoginUrl()}
            data-btn-oauth
            data-btn-full
          >
            <span data-google-icon aria-hidden="true" />
            Continue with Google
          </a>

          <div data-login-signup-hint>
            New to the Property Portal?{' '}
            <a href="/register" data-link>
              Create account →
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage(): React.ReactElement {
  return (
    <React.Suspense fallback={<></>}>
      <LoginPageInner />
    </React.Suspense>
  );
}
