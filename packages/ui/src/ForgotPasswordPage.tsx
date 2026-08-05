'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { forgotPasswordSchema } from '@stayos/validators';
import type { ForgotPasswordInput } from '@stayos/validators';
import { InlineError, applyServerErrors } from '@stayos/ui';

interface ForgotPasswordPageProps {
  /** Must match the portal's own userType so the backend queries the right model */
  userType: ForgotPasswordInput['userType'];
  loginPath: string;
}

export default function ForgotPasswordPage({
  userType,
  loginPath,
}: ForgotPasswordPageProps): React.ReactElement {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', userType },
  });

  async function handleSubmit(values: ForgotPasswordInput): Promise<void> {
    setSubmitting(true);
    try {
      await api.auth.forgotPassword(values);
      // Always show the same success state — never reveal whether the
      // email exists (prevents enumeration). See Document 02 §0.
      setSubmitted(true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, apiErr);
      }
      // Non-validation errors are silently absorbed — still show the same
      // "if an account exists" copy so as not to reveal server state.
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <h1>Check your email</h1>
          <p>
            If an account exists for that email address, you&apos;ll receive a
            password reset link shortly.
          </p>
          <a href={loginPath} data-btn-ghost data-btn-full>
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div data-auth-page>
      <div data-auth-panel>
        <h1>Reset your password</h1>
        <p>Enter your email address and we&apos;ll send you a reset link.</p>

        <form
          onSubmit={form.handleSubmit((v) => void handleSubmit(v))}
          noValidate
          data-auth-form
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

          <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>

          <a href={loginPath} data-btn-ghost data-btn-full>
            Back to sign in
          </a>
        </form>
      </div>
    </div>
  );
}
