'use client';

import Link from 'next/link';
import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { useSessionContext } from '@stayos/auth';
import { loginSchema, registerSchema } from '@stayos/validators';
import type { LoginInput, RegisterInput } from '@stayos/validators';
import { InlineError, applyServerErrors, MfaStep } from '@stayos/ui';

type Tab = 'signin' | 'register';

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useSessionContext();

  const [tab, setTab] = useState<Tab>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [mfaState, setMfaState] = useState<{
    tempToken: string;
    loginValues: LoginInput;
  } | null>(null);

  const redirect = searchParams.get('redirect') ?? '/bookings';

  // ── Sign in form ──────────────────────────────────────────────────────────
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', userType: 'customer', rememberMe: false },
  });

  // ── Register form ─────────────────────────────────────────────────────────
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  function switchTab(next: Tab): void {
    setTab(next);
    setFormError('');
  }

  async function handleLogin(values: LoginInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      const result = await api.auth.login(values);
      if (result.mfaRequired && result.tempToken) {
        setMfaState({ tempToken: result.tempToken, loginValues: values });
        setSubmitting(false);
        return;
      }
      await setSession(result.accessToken);
      router.replace(redirect);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(loginForm, apiErr);
      } else {
        setFormError(apiErr.message ?? 'Sign-in failed. Please try again.');
      }
      setSubmitting(false);
    }
  }

  async function handleRegister(values: RegisterInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      await api.customer.register(values);
      setRegisterSuccess(true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(registerForm, apiErr);
      } else {
        setFormError(apiErr.message ?? 'Registration failed. Please try again.');
      }
      setSubmitting(false);
    }
  }

  // ── MFA step ──────────────────────────────────────────────────────────────
  if (mfaState) {
    return (
      <div data-login-page data-portal="customer">
        <div data-login-left data-portal="customer">
          <GuestValueProp />
        </div>
        <div data-login-right>
          <div data-login-form-wrap>
            <MfaStep
              tempToken={mfaState.tempToken}
              loginValues={mfaState.loginValues}
              onSuccess={async (token) => {
                await setSession(token);
                router.replace(redirect);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-login-page data-portal="customer">
      {/* Left panel */}
      <div data-login-left data-portal="customer">
        <GuestValueProp />
      </div>

      {/* Right panel */}
      <div data-login-right>
        <div data-login-form-wrap>
          <div data-login-heading>
            <h2>{tab === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p>
              {tab === 'signin'
                ? 'Sign in to access your account'
                : 'Join StayOS to book and manage your stays'}
            </p>
          </div>

          <div data-login-card>
            {/* ── Sign in form ─────────────────────────────────────────────── */}
            {tab === 'signin' && (
              <form
                onSubmit={loginForm.handleSubmit((v) => void handleLogin(v))}
                data-login-form
                noValidate
              >
                <div data-form-group>
                  <label htmlFor="email">Email address</label>
                  <div data-input-icon>
                    <MailIcon />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      {...loginForm.register('email')}
                    />
                  </div>
                  <InlineError message={loginForm.formState.errors.email?.message} />
                </div>

                <div data-form-group>
                  <label htmlFor="password">Password</label>
                  <div data-input-icon data-input-icon-suffix>
                    <LockIcon />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      data-password-toggle
                      style={{ left: 'auto', right: 'var(--space-3)' }}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <InlineError message={loginForm.formState.errors.password?.message} />
                </div>

                <div data-form-row>
                  <label data-checkbox-label>
                    <input type="checkbox" {...loginForm.register('rememberMe')} />
                    Remember me
                  </label>
                  <Link href="/forgot-password" data-link>Forgot password?</Link>
                </div>

                {formError && <span role="alert" data-form-error>{formError}</span>}

                <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
                  {submitting ? 'Signing in…' : 'Sign in'} <ArrowRightIcon />
                </button>

                <div data-divider><span>or</span></div>

                {/* Google OAuth only — Apple is NOT supported in StayOS */}
                <a href={api.auth.googleLoginUrl()} data-btn-oauth data-btn-full>
                  <GoogleIcon />
                  Continue with Google
                </a>
              </form>
            )}

            {/* ── Register form ─────────────────────────────────────────────── */}
            {tab === 'register' && (
              <>
                {registerSuccess ? (
                  <div data-register-success role="status">
                    <h2>Check your email</h2>
                    <p>
                      We&apos;ve sent a verification link to{' '}
                      <strong>{registerForm.getValues('email')}</strong>. Click
                      the link to activate your account.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={registerForm.handleSubmit((v) => void handleRegister(v))}
                    data-login-form
                    noValidate
                  >
                    <div data-form-row>
                      <div data-form-group>
                        <label htmlFor="firstName">First name</label>
                        <input
                          id="firstName"
                          type="text"
                          autoComplete="given-name"
                          placeholder="Jack"
                          {...registerForm.register('firstName')}
                        />
                        <InlineError message={registerForm.formState.errors.firstName?.message} />
                      </div>
                      <div data-form-group>
                        <label htmlFor="lastName">Last name</label>
                        <input
                          id="lastName"
                          type="text"
                          autoComplete="family-name"
                          placeholder="Mohlala"
                          {...registerForm.register('lastName')}
                        />
                        <InlineError message={registerForm.formState.errors.lastName?.message} />
                      </div>
                    </div>

                    <div data-form-group>
                      <label htmlFor="reg-email">Email address</label>
                      <div data-input-icon>
                        <MailIcon />
                        <input
                          id="reg-email"
                          type="email"
                          autoComplete="email"
                          placeholder="Enter your email"
                          {...registerForm.register('email')}
                        />
                      </div>
                      <InlineError message={registerForm.formState.errors.email?.message} />
                    </div>

                    <div data-form-group>
                      <label htmlFor="reg-password">Password</label>
                      <div data-input-icon>
                        <LockIcon />
                        <input
                          id="reg-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Create a password"
                          {...registerForm.register('password')}
                        />
                      </div>
                      <InlineError message={registerForm.formState.errors.password?.message} />
                    </div>

                    {formError && <span role="alert" data-form-error>{formError}</span>}

                    <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
                      {submitting ? 'Creating account…' : 'Create account'} <ArrowRightIcon />
                    </button>
                  </form>
                )}
              </>
            )}

            {!registerSuccess && (
              <p data-login-legal>
                By continuing, you agree to our{' '}
                <Link href="/legal/terms">Terms of Use</Link> and{' '}
                <Link href="/legal/privacy">Privacy Policy</Link>.
              </p>
            )}
          </div>

          {/* ── Toggle between sign in / create account ─────────────────────── */}
          {!registerSuccess && (
            <div data-login-toggle>
              {tab === 'signin' ? (
                <>Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => switchTab('register')}>Create account</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => switchTab('signin')}>Sign in</button>
                </>
              )}
            </div>
          )}

          {/* ── Trust row ─────────────────────────────────────────────────────── */}
          <div data-login-trust-row>
            <div data-login-trust-item>
              <span data-trust-icon aria-hidden="true"><ShieldIcon /></span>
              <div>
                <strong>Free cancellation</strong>
                <span>on most bookings</span>
              </div>
            </div>
            <div data-login-trust-item>
              <span data-trust-icon aria-hidden="true"><ClockIcon /></span>
              <div>
                <strong>24/7 support</strong>
                <span>We&apos;re here to help</span>
              </div>
            </div>
            <div data-login-trust-item>
              <span data-trust-icon aria-hidden="true"><LockIcon /></span>
              <div>
                <strong>Secure payments</strong>
                <span>Encrypted &amp; protected</span>
              </div>
            </div>
          </div>

          <div data-login-footer>
            © {new Date().getFullYear()} StayOS. All rights reserved. ·{' '}
            <Link href="/legal/terms">Terms of Use</Link> ·{' '}
            <Link href="/legal/privacy">Privacy Policy</Link> ·{' '}
            <Link href="/legal/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Left panel value proposition ───────────────────────────────────────────
function GuestValueProp(): React.ReactElement {
  return (
    <>
      <div data-login-portal-label>
        <span data-portal-icon aria-hidden="true" />
        <span data-logo-wordmark>Stay<span data-logo-accent>OS</span></span>
        <span style={{ marginLeft: 'var(--space-1)' }}>Customer Portal</span>
      </div>

      <h1>
        Your Stay.<br />
        <span data-login-headline-accent>Smarter.</span>
      </h1>

      <p data-login-subtitle>
        Book. Manage. Enjoy. All in one place.
      </p>

      <ul data-login-features>
        {[
          { icon: <CalendarIcon />, label: 'View & manage your bookings', detail: 'Access your stays, confirmations and more.' },
          { icon: <TagIcon />,      label: 'Wide range of properties',    detail: 'Hotels, resorts, apartments and more all in one place.' },
          { icon: <ShieldIcon />,   label: 'Secure & Trusted',            detail: 'Your data and payments are safe with enterprise-grade security.' },
        ].map((f) => (
          <li key={f.label} data-login-feature>
            <span data-feature-icon aria-hidden="true">{f.icon}</span>
            <div>
              <strong>{f.label}</strong>
              <span>{f.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ── Inline icons (no external icon package dependency) ──────────────────────
function MailIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function LockIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M6.61 6.61C3.06 8.9 1 12 1 12s4 8 11 8a9.26 9.26 0 0 0 5.39-1.61" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function ArrowRightIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ShieldIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
    </svg>
  );
}

function ClockIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CalendarIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function TagIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg data-google-icon viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}
