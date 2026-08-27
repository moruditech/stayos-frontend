import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { useSessionContext } from '@stayos/auth';
import { loginSchema } from '@stayos/validators';
import type { LoginInput } from '@stayos/validators';
import { InlineError, applyServerErrors, MfaStep } from '@stayos/ui';

export default function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession } = useSessionContext();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [mfaState, setMfaState] = useState<{ tempToken: string; loginValues: LoginInput } | null>(null);

  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', userType: 'platform', rememberMe: false },
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
      await setSession(result.accessToken, result.refreshToken);
      navigate(redirect, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else setFormError(apiErr.message ?? 'Sign-in failed.');
      setSubmitting(false);
    }
  }

  if (mfaState) {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <p data-login-portal-label>PLATFORM ADMIN</p>
          <MfaStep
            tempToken={mfaState.tempToken}
            loginValues={mfaState.loginValues}
            onSuccess={async (token, refreshToken) => {
              await setSession(token, refreshToken);
              navigate(redirect, { replace: true });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div data-login-page data-portal="admin">
      <div data-auth-panel>
        <p data-login-portal-label>STAYOS PLATFORM ADMIN</p>
        <h1>Platform administration</h1>
        <p data-login-subtitle>Internal access only.</p>

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
              <button type="button" onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide' : 'Show'} data-password-toggle>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <InlineError message={form.formState.errors.password?.message} />
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
