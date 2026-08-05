'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors } from '@stayos/ui';
import { z } from 'zod';

// Owner registration collects company details in addition to personal fields.
// Verified against addPropertySchema / owner.routes.js#register.
const ownerRegisterSchema = z.object({
  firstName:   z.string().min(1, 'First name is required'),
  lastName:    z.string().min(1, 'Last name is required'),
  email:       z.string().email('Valid email required'),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  phone:       z.string().optional(),
  companyName: z.string().optional(),
  vatNumber:   z.string().optional(),
});
type OwnerRegisterInput = z.infer<typeof ownerRegisterSchema>;

export default function OwnerRegisterPage(): React.ReactElement {
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const form = useForm<OwnerRegisterInput>({
    resolver: zodResolver(ownerRegisterSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  async function handleSubmit(values: OwnerRegisterInput): Promise<void> {
    setSubmitting(true);
    setFormError('');
    try {
      await api.owner.register(values);
      setSuccess(true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else setFormError(apiErr.message ?? 'Registration failed.');
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div data-auth-page>
        <div data-auth-panel>
          <h1>Account created</h1>
          <p>Check your email to verify your address and activate your account.</p>
          <a href="/login" data-btn-primary data-btn-full>Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div data-auth-page>
      <div data-auth-panel>
        <h1>Create an owner account</h1>

        <form onSubmit={form.handleSubmit((v) => void handleSubmit(v))} noValidate data-auth-form>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="firstName">First name</label>
              <input id="firstName" type="text" autoComplete="given-name" {...form.register('firstName')} />
              <InlineError message={form.formState.errors.firstName?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" type="text" autoComplete="family-name" {...form.register('lastName')} />
              <InlineError message={form.formState.errors.lastName?.message} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" {...form.register('email')} />
            <InlineError message={form.formState.errors.email?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
            <InlineError message={form.formState.errors.password?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="phone">Phone <span data-optional>(optional)</span></label>
            <input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
          </div>

          <div data-form-group>
            <label htmlFor="companyName">Company name <span data-optional>(optional)</span></label>
            <input id="companyName" type="text" {...form.register('companyName')} />
          </div>

          <div data-form-group>
            <label htmlFor="vatNumber">VAT number <span data-optional>(optional)</span></label>
            <input id="vatNumber" type="text" {...form.register('vatNumber')} />
          </div>

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>

          <a href="/login" data-btn-ghost data-btn-full>Already have an account? Sign in</a>
        </form>
      </div>
    </div>
  );
}
