'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { resetPasswordSchema } from '@stayos/validators';
import type { ResetPasswordInput } from '@stayos/validators';
import { InlineError, applyServerErrors } from '@stayos/ui';

interface ResetPasswordPageProps {
  token: string;
  loginPath: string;
}

export default function ResetPasswordPage({
  token,
  loginPath,
}: ResetPasswordPageProps): React.ReactElement {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function handleSubmit(values: ResetPasswordInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      await api.auth.resetPassword(token, values);
      setDone(true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, apiErr);
      } else if (apiErr.code === 'TOKEN_EXPIRED' || apiErr.code === 'TOKEN_INVALID') {
        setFormError(
          'This reset link has expired or is invalid. Request a new one.'
        );
      } else {
        setFormError(apiErr.message ?? 'Reset failed. Please try again.');
      }
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <h1>Password updated</h1>
          <p>Your password has been changed. All other active sessions have been signed out.</p>
          <a href={loginPath} data-btn-primary data-btn-full>
            Sign in with new password
          </a>
        </div>
      </div>
    );
  }

  return (
    <div data-auth-page>
      <div data-auth-panel>
        <h1>Set new password</h1>

        <form
          onSubmit={form.handleSubmit((v) => void handleSubmit(v))}
          noValidate
          data-auth-form
        >
          <div data-form-group>
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            <InlineError message={form.formState.errors.password?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />
            <InlineError message={form.formState.errors.confirmPassword?.message} />
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
