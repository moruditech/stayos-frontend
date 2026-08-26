'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, ConsentGate, Icons } from '@stayos/ui';

interface Props { params: { slug: string } }

export default function ApplicationFormPage({ params }: Props): React.ReactElement {
  const session   = useSession();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [consented, setConsented]  = useState(false);
  const [answers, setAnswers]      = useState<Record<string, string>>({});
  const [termsAccepted, setTerms]  = useState(false);

  // GET /university/forms/:slug/public — no auth required
  const { data: formTemplate, isLoading } = useQuery({
    queryKey: ['university', 'form', params.slug],
    queryFn:  () => api.university.getForm(params.slug),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.university.submitApplication(params.slug, payload),
    onSuccess: () => setSubmitted(true),
    onError: (err: ApiError) => {
      if (err.code === 'FORM_CLOSED') {
        setFormError('This application form is now closed.');
      } else {
        setFormError(err.message ?? 'Submission failed. Please try again.');
      }
    },
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const ft = formTemplate as Record<string, unknown> | undefined;
  if (!ft) return <div data-page><p>Application form not found.</p></div>;

  const fields      = (ft['fields'] as Record<string, unknown>[]) ?? [];
  const closingDate = ft['closingDate'] ? new Date(ft['closingDate'] as string) : null;
  const isClosed    = !!(closingDate && closingDate < new Date());
  const requiredDocs= (ft['requiredDocuments'] as string[]) ?? [];
  const propertyName = ft['propertyName'] as string;
  const terms = ft['terms'] as string | undefined;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!termsAccepted) {
      setFormError('You must accept the terms and conditions.');
      return;
    }
    if (!consented) {
      setFormError('You must accept the data sharing consent.');
      return;
    }
    setFormError('');

    const payload: Record<string, unknown> = {
      answers,
      termsAccepted: true,
      consentSnapshot: {
        acknowledged: true,
        text: `By submitting this application, you agree to share your personal information with ${propertyName} for accommodation placement purposes in accordance with POPIA.`,
      },
    };
    // If session exists, the backend links to the existing customer record automatically
    submitMutation.mutate(payload);
  }

  if (submitted) {
    return (
      <div data-page>
        <div data-card-padded style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-success)', marginBottom: 'var(--space-5)' }}><Icons.CheckCircle2 size={56} /></div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>
            Application submitted!
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
            Your application to {ft['propertyName'] as string} has been received. We&apos;ll be in touch shortly.
          </p>
          {session ? (
            <Link href="/applications" data-btn-primary>View my applications →</Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Create an account to track your application status.
              </p>
              <Link href="/register" data-btn-primary>Create account →</Link>
              <Link href="/" data-btn-ghost>Return to home</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-page>
      <h1 data-page-title>Apply for accommodation</h1>
      <p data-page-subtitle>{ft['propertyName'] as string}</p>

      {isClosed && (
        <div data-card-padded style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-error)', marginBottom: 'var(--space-5)' }}>
          <strong style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
            Applications closed
          </strong>
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            The closing date for this application was {closingDate?.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      )}

      {closingDate && !isClosed && (
        <div data-card-padded style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)', marginBottom: 'var(--space-5)' }}>
          <strong style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.Calendar size={16} /> Closing date: {closingDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </strong>
        </div>
      )}

      {/* Account hint for unauthenticated applicants */}
      {!session && (
        <div data-card-padded style={{ background: 'var(--color-primary-light)', marginBottom: 'var(--space-5)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.Lightbulb size={16} /> Already have an account?{' '}
            <Link href={`/login?redirect=/accommodation/${params.slug}/apply`} data-link>Sign in</Link>{' '}
            to pre-fill your details.
          </p>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Dynamic form fields from template */}
          {fields.map((field) => (
            <DynamicField
              key={field['name'] as string}
              field={field}
              value={answers[field['name'] as string] ?? ''}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [field['name'] as string]: val }))}
            />
          ))}

          {/* Required documents list */}
          {requiredDocs.length > 0 && (
            <div data-card-padded style={{ background: 'var(--color-surface-muted)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>
                Required documents
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {requiredDocs.map((doc) => (
                  <li key={doc} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', gap: 'var(--space-2)' }}>
                    <Icons.Paperclip size={14} /> {doc}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
                Documents can be uploaded after submission from your applications dashboard.
              </p>
            </div>
          )}

          {/* Terms acceptance */}
          {terms && (
            <div data-card-padded style={{ background: 'var(--color-surface-muted)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>Terms and conditions</h3>
              <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                {terms}
              </div>
              <label data-checkbox-label>
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTerms(e.target.checked)} />
                I have read and agree to the terms and conditions
              </label>
            </div>
          )}

          {/* Data sharing consent — never pre-checked (TAD 07 §3) */}
          <ConsentGate
            legalText={
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                By submitting this application, you agree to share your personal information with{' '}
                <strong>{ft['propertyName'] as string}</strong> for accommodation placement purposes in accordance with POPIA and our Privacy Policy.
              </p>
            }
            onConsent={setConsented}
          />

          {formError && <span role="alert" data-form-error>{formError}</span>}

          <button
            type="submit"
            disabled={submitMutation.isPending || isClosed}
            data-btn-primary
            data-btn-full
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DynamicField({
  field, value, onChange,
}: {
  field: Record<string, unknown>;
  value: string;
  onChange: (val: string) => void;
}): React.ReactElement {
  const name     = field['name'] as string;
  const label    = field['label'] as string;
  const type     = field['type'] as string;
  const required = field['required'] as boolean;
  const options  = field['options'] as string[] | undefined;

  return (
    <div data-form-group>
      <label htmlFor={name}>
        {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea id={name} rows={4} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
      ) : type === 'select' && options ? (
        <select id={name} value={value} required={required} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={name} type={type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
          value={value} required={required} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
