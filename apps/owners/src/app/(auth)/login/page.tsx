'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { useSessionContext, useSessionLoading } from '@stayos/auth';
import { loginSchema } from '@stayos/validators';
import type { LoginInput } from '@stayos/validators';
import { InlineError, applyServerErrors, MfaStep } from '@stayos/ui';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useSessionContext();
  const isLoading = useSessionLoading();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [mfaState, setMfaState] = useState<{ tempToken: string; loginValues: LoginInput } | null>(null);

  const redirect = searchParams.get('redirect') ?? '/properties';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', userType: 'owner', rememberMe: false },
  });

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
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else setFormError(apiErr.message ?? 'Sign-in failed.');
      setSubmitting(false);
    }
  }

  if (isLoading) return <></>;

  if (mfaState) {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <MfaStep
            tempToken={mfaState.tempToken}
            loginValues={mfaState.loginValues}
            onSuccess={async (token) => { await setSession(token); router.replace(redirect); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div data-login-page data-portal="owners">
      <div data-login-left>
        <div data-login-portal-label>OWNER PORTAL</div>
        <h1>Manage your<br /><span data-login-headline-accent>property portfolio.</span></h1>
        <p data-login-subtitle>
          Register properties, manage mandates, and access your property
          operations dashboard.
        </p>
      </div>

      <div data-login-right>
        <form onSubmit={form.handleSubmit((v) => void handleLogin(v))} data-login-form noValidate>
          <div data-form-group>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" {...form.register('email')} />
            <InlineError message={form.formState.errors.email?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="password">Password</label>
            <div data-input-with-suffix>
              <input id="password" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" {...form.register('password')} />
              <button type="button" onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide' : 'Show'} data-password-toggle>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <InlineError message={form.formState.errors.password?.message} />
          </div>

          <div data-form-row>
            <label data-checkbox-label>
              <input type="checkbox" {...form.register('rememberMe')} /> Remember me
            </label>
            <a href="/forgot-password" data-link>Forgot password?</a>
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div data-login-signup-hint>
            New here? <a href="/register" data-link>Create an owner account →</a>
          </div>
        </form>
      </div>
    </div>
  );
}
