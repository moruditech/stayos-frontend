'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { changePasswordSchema } from '@stayos/validators';
import type { ChangePasswordInput } from '@stayos/validators';
import { InlineError, applyServerErrors, Icons } from '@stayos/ui';

// PATCH /customers/me/password — signs out all other sessions on success
export default function ChangePasswordPage(): React.ReactElement {
  const router = useRouter();
  const [done, setDone]           = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword:'', newPassword:'' },
  });

  async function handleSubmit(values: ChangePasswordInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      await api.auth.changePassword(values);
      setDone(true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, apiErr);
      } else if (apiErr.code === 'INVALID_CREDENTIALS') {
        form.setError('currentPassword', { message:'Current password is incorrect.' });
      } else {
        setFormError(apiErr.message ?? 'Password change failed. Please try again.');
      }
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div data-page>
        <div style={{ maxWidth:480 }}>
          <div style={{ padding:'var(--space-8)', background:'var(--color-success-bg)', borderRadius:'var(--radius-xl)', textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', color:'var(--color-success)', marginBottom:'var(--space-4)' }}><Icons.CheckCircle2 size={40} /></div>
            <h2 style={{ fontSize:'var(--text-lg)', fontWeight:'var(--font-bold)', color:'var(--color-success)', marginBottom:'var(--space-2)' }}>Password updated</h2>
            <p style={{ fontSize:'var(--text-sm)', color:'var(--color-success)', marginBottom:'var(--space-6)' }}>
              All other active sessions have been signed out. You remain signed in on this device.
            </p>
            <button type="button" data-btn-primary onClick={() => router.push('/profile')}>
              Back to profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-page>
      <a href="/profile" data-link style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', fontSize:'var(--text-sm)', marginBottom:'var(--space-5)', textDecoration:'none', color:'var(--color-text-secondary)' }}>
        <Icons.ChevronLeft size={16} /> Back to profile
      </a>

      <h1 data-page-title>Change password</h1>
      <p data-page-subtitle>Changing your password signs out all other active sessions.</p>

      <form onSubmit={form.handleSubmit((v) => void handleSubmit(v))} noValidate
        style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)', maxWidth:400 }}>

        <div data-form-group>
          <label htmlFor="cp-cur">Current password</label>
          <div data-input-with-suffix>
            <input id="cp-cur" type={showCurrent?'text':'password'} autoComplete="current-password"
              {...form.register('currentPassword')} />
            <button type="button" onClick={() => setShowCurrent(s=>!s)} data-password-toggle
              aria-label={showCurrent?'Hide password':'Show password'}>
              {showCurrent?'Hide':'Show'}
            </button>
          </div>
          <InlineError message={form.formState.errors.currentPassword?.message} />
        </div>

        <div data-form-group>
          <label htmlFor="cp-new">New password</label>
          <div data-input-with-suffix>
            <input id="cp-new" type={showNew?'text':'password'} autoComplete="new-password"
              {...form.register('newPassword')} />
            <button type="button" onClick={() => setShowNew(s=>!s)} data-password-toggle
              aria-label={showNew?'Hide password':'Show password'}>
              {showNew?'Hide':'Show'}
            </button>
          </div>
          <InlineError message={form.formState.errors.newPassword?.message} />
          <span style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>
            Minimum 8 characters.
          </span>
        </div>

        {formError && <span role="alert" data-form-error>{formError}</span>}

        <button type="submit" disabled={submitting} data-btn-primary>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
