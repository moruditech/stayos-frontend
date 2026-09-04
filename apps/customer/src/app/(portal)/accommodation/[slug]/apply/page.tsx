'use client';
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Icons } from '@stayos/ui';

const FUNDING_TYPES: { id: string; label: string }[] = [
  { id: 'self_paying', label: 'Self-paying' },
  { id: 'nsfas',        label: 'NSFAS' },
  { id: 'bursary',      label: 'Bursary' },
  { id: 'partial',      label: 'Partial funding' },
];

const CONSENT_TEXT =
  'I consent to my personal information being shared with this institution ' +
  'for the purpose of processing my student accommodation application.';

interface FormField {
  fieldId: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'file' | 'number';
  label: string;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  options?: { label: string; value: string }[] | undefined;
  order?: number | undefined;
}

interface Props { params: { slug: string } }

export default function ApplyPage({ params }: Props): React.ReactElement {
  const slug          = params.slug;
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const roomId        = searchParams.get('roomId') ?? undefined;
  const { toast }     = useToast();

  const [submitted, setSubmitted]         = useState<string | null>(null);
  const [formError, setFormError]         = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]     = useState<Record<string, string>>({});
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const [applicant, setApplicant] = useState({
    applicantFirstName: '', applicantLastName: '', applicantEmail: '', applicantPhone: '',
    institutionName: '', studentNumber: '', faculty: '', course: '', yearOfStudy: '',
    fundingType: '', bursaryFunder: '', nsfasReferenceNumber: '',
    dietaryRequirements: '', specialNeeds: '',
  });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  const { data: forms, isLoading, error: loadError } = useQuery({
    queryKey: ['accommodation', 'application-forms', slug],
    queryFn:  () => api.discovery.listApplicationForms(slug),
    retry: false,
  });

  const formList = (forms as Record<string, unknown>[] | undefined) ?? [];
  // Default to the only open form, or the first (soonest-closing) one when there's a choice —
  // the applicant can still switch via the picker below.
  const activeFormId = selectedFormId ?? (formList[0]?.['_id'] as string | undefined) ?? null;
  const form = formList.find((f) => (f['_id'] as string) === activeFormId);

  const submitMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!activeFormId) throw new Error('No application form selected');
      return api.discovery.submitApplicationForProperty(slug, activeFormId, payload);
    },
    onSuccess:  (result) => {
      setSubmitted((result as Record<string, unknown>)['applicationId'] as string ?? 'submitted');
    },
    onError: (err: ApiError) => {
      if (err.code === 'PROMOTION_EXPIRED') {
        setFormError('This application form is now closed.');
      } else if (err.code === 'VALIDATION_ERROR' && err.fields?.length) {
        const next: Record<string, string> = {};
        err.fields.forEach((f) => { next[f.field] = f.message; });
        setFieldErrors(next);
        setFormError('Please fix the highlighted fields and try again.');
      } else {
        toast(err.message ?? 'Failed to submit application.', 'error');
      }
    },
  });

  function updateApplicant(key: keyof typeof applicant, value: string): void {
    setApplicant((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!agreed) {
      setFormError('You must accept the terms and consent to continue.');
      return;
    }

    const template = (form as Record<string, unknown>) ?? {};
    const templateFields = ((template['fields'] as FormField[] | undefined) ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const missingCustom = templateFields.filter((f) => f.required && !customAnswers[f.fieldId]);
    if (!applicant.fundingType) {
      setFormError('Please select how your studies are funded.');
      return;
    }
    if (missingCustom.length > 0) {
      const next: Record<string, string> = {};
      missingCustom.forEach((f) => { next[f.fieldId] = `${f.label} is required`; });
      setFieldErrors(next);
      setFormError('Please fill in all required fields.');
      return;
    }

    submitMutation.mutate({
      applicantFirstName: applicant.applicantFirstName,
      applicantLastName:  applicant.applicantLastName,
      applicantEmail:     applicant.applicantEmail,
      applicantPhone:     applicant.applicantPhone || undefined,
      institutionName:    applicant.institutionName,
      studentNumber:      applicant.studentNumber || undefined,
      faculty:            applicant.faculty || undefined,
      course:             applicant.course || undefined,
      yearOfStudy:        applicant.yearOfStudy ? Number(applicant.yearOfStudy) : undefined,
      fundingType:        applicant.fundingType,
      bursaryFunder:      applicant.fundingType === 'bursary' ? (applicant.bursaryFunder || undefined) : undefined,
      nsfasReferenceNumber: applicant.fundingType === 'nsfas' ? (applicant.nsfasReferenceNumber || undefined) : undefined,
      dietaryRequirements: applicant.dietaryRequirements || undefined,
      specialNeeds:        applicant.specialNeeds || undefined,
      roomTypePreference:  roomId ? [roomId] : undefined,
      customAnswers: templateFields.map((f) => ({
        fieldId: f.fieldId, label: f.label, value: customAnswers[f.fieldId] ?? '',
      })),
      termsAccepted: true,
      consentSnapshot: { acknowledged: true, text: CONSENT_TEXT },
    });
  }

  if (isLoading) {
    return <div data-page><SkeletonLoader rows={6} /></div>;
  }

  if (loadError || !form) {
    const err = loadError as ApiError | undefined;
    return (
      <div data-page>
        <EmptyState
          title={err?.code === 'NOT_FOUND' ? 'Application form not found' : 'Something went wrong'}
          description="This property may not currently be accepting student housing applications."
          action={<button type="button" data-btn-primary onClick={() => router.push(`/accommodation/${slug}`)}>Back to property</button>}
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div data-page style={{ textAlign: 'center', maxWidth: '30rem', margin: '0 auto', padding: 'var(--space-10) 0' }}>
        <Icons.CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }} />
        <h1 data-page-title style={{ marginBottom: 'var(--space-2)' }}>Application submitted</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          We&apos;ve emailed you a confirmation. You can track the status of your application from your account.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button type="button" data-btn-secondary onClick={() => router.push('/applications')}>View my applications</button>
          <button type="button" data-btn-primary onClick={() => router.push('/accommodation')}>Back to search</button>
        </div>
      </div>
    );
  }

  const template = form as Record<string, unknown>;
  const templateFields = ((template['fields'] as FormField[] | undefined) ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const closingDate = template['closingDate'] as string | undefined;
  const isClosed = !!closingDate && new Date(closingDate) < new Date();

  return (
    <div data-page style={{ maxWidth: '38rem' }}>
      <button type="button" data-back-link
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}
        onClick={() => router.push(`/accommodation/${slug}`)}>
        <Icons.ChevronLeft size={16} /> Back to property
      </button>

      <h1 data-page-title>Apply for {template['propertyName'] as string}</h1>
      {!!template['welcomeMessage'] && (
        <p data-page-subtitle>{template['welcomeMessage'] as string}</p>
      )}

      {formList.length > 1 && (
        <div data-form-group style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="form-picker">Which application would you like to submit?</label>
          <select id="form-picker" value={activeFormId ?? ''}
            onChange={(e) => setSelectedFormId(e.target.value)}>
            {formList.map((f) => (
              <option key={f['_id'] as string} value={f['_id'] as string}>
                {f['title'] as string} ({f['academicYear'] as string})
              </option>
            ))}
          </select>
        </div>
      )}

      {isClosed ? (
        <EmptyState title="This application form is closed"
          description="Applications for this academic year are no longer being accepted." />
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
          {formError && (
            <div data-form-error role="alert">{formError}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Your details</h3>
            <div data-form-grid-2>
              <div data-form-group>
                <label htmlFor="afn">First name *</label>
                <input id="afn" required value={applicant.applicantFirstName}
                  onChange={(e) => updateApplicant('applicantFirstName', e.target.value)} />
              </div>
              <div data-form-group>
                <label htmlFor="aln">Last name *</label>
                <input id="aln" required value={applicant.applicantLastName}
                  onChange={(e) => updateApplicant('applicantLastName', e.target.value)} />
              </div>
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label htmlFor="aem">Email *</label>
                <input id="aem" type="email" required value={applicant.applicantEmail}
                  onChange={(e) => updateApplicant('applicantEmail', e.target.value)} />
                {fieldErrors['applicantEmail'] && <span data-inline-error>{fieldErrors['applicantEmail']}</span>}
              </div>
              <div data-form-group>
                <label htmlFor="aph">Phone</label>
                <input id="aph" type="tel" value={applicant.applicantPhone}
                  onChange={(e) => updateApplicant('applicantPhone', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Studies</h3>
            <div data-form-group>
              <label htmlFor="inst">Institution name *</label>
              <input id="inst" required value={applicant.institutionName}
                onChange={(e) => updateApplicant('institutionName', e.target.value)} />
              {fieldErrors['institutionName'] && <span data-inline-error>{fieldErrors['institutionName']}</span>}
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label htmlFor="sn">Student number</label>
                <input id="sn" value={applicant.studentNumber}
                  onChange={(e) => updateApplicant('studentNumber', e.target.value)} />
              </div>
              <div data-form-group>
                <label htmlFor="yos">Year of study</label>
                <input id="yos" type="number" min={1} value={applicant.yearOfStudy}
                  onChange={(e) => updateApplicant('yearOfStudy', e.target.value)} />
              </div>
            </div>
            <div data-form-grid-2>
              <div data-form-group>
                <label htmlFor="fac">Faculty</label>
                <input id="fac" value={applicant.faculty}
                  onChange={(e) => updateApplicant('faculty', e.target.value)} />
              </div>
              <div data-form-group>
                <label htmlFor="course">Course</label>
                <input id="course" value={applicant.course}
                  onChange={(e) => updateApplicant('course', e.target.value)} />
              </div>
            </div>
            <div data-form-group>
              <label htmlFor="funding">How are your studies funded? *</label>
              <select id="funding" required value={applicant.fundingType}
                onChange={(e) => updateApplicant('fundingType', e.target.value)}>
                <option value="">Select an option</option>
                {FUNDING_TYPES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            {applicant.fundingType === 'bursary' && (
              <div data-form-group>
                <label htmlFor="bf">Bursary funder</label>
                <input id="bf" value={applicant.bursaryFunder}
                  onChange={(e) => updateApplicant('bursaryFunder', e.target.value)} />
              </div>
            )}
            {applicant.fundingType === 'nsfas' && (
              <div data-form-group>
                <label htmlFor="nref">NSFAS reference number</label>
                <input id="nref" value={applicant.nsfasReferenceNumber}
                  onChange={(e) => updateApplicant('nsfasReferenceNumber', e.target.value)} />
              </div>
            )}
          </div>

          {templateFields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Additional questions</h3>
              {templateFields.map((f) => (
                <DynamicField key={f.fieldId} field={f}
                  value={customAnswers[f.fieldId] ?? ''}
                  error={fieldErrors[f.fieldId]}
                  onChange={(v) => setCustomAnswers((prev) => ({ ...prev, [f.fieldId]: v }))} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Anything else we should know?</h3>
            <div data-form-group>
              <label htmlFor="diet">Dietary requirements</label>
              <input id="diet" value={applicant.dietaryRequirements}
                onChange={(e) => updateApplicant('dietaryRequirements', e.target.value)} />
            </div>
            <div data-form-group>
              <label htmlFor="needs">Special needs / accessibility requirements</label>
              <textarea id="needs" rows={3} value={applicant.specialNeeds}
                onChange={(e) => updateApplicant('specialNeeds', e.target.value)} />
            </div>
          </div>

          <label data-checkbox-label>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I accept the terms and conditions, and {CONSENT_TEXT.charAt(0).toLowerCase() + CONSENT_TEXT.slice(1)}</span>
          </label>

          <button type="submit" data-btn-primary data-btn-full disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      )}
    </div>
  );
}

function DynamicField({ field, value, error, onChange }: {
  field: FormField; value: string; error?: string | undefined; onChange: (value: string) => void;
}): React.ReactElement {
  const id = `field-${field.fieldId}`;
  return (
    <div data-form-group>
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
      {field.type === 'textarea' ? (
        <textarea id={id} rows={3} placeholder={field.placeholder} value={value}
          onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select an option</option>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : field.type === 'checkbox' ? (
        <label data-checkbox-label>
          <input id={id} type="checkbox" checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')} />
          <span>{field.placeholder ?? 'Yes'}</span>
        </label>
      ) : field.type === 'date' ? (
        <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'number' ? (
        <input id={id} type="number" placeholder={field.placeholder} value={value}
          onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" placeholder={field.placeholder} value={value}
          onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <span data-inline-error>{error}</span>}
    </div>
  );
}
