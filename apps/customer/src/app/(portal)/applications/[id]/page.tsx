'use client';

import Link from 'next/link';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, Icons } from '@stayos/ui';
import { applicationKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

// Real StudentApplication.status enum (StudentApplication.model.js) — richer
// than a simple pending/approved/declined set.
const STATUS_LABEL: Record<string, string> = {
  draft:          'Draft',
  submitted:      'Submitted',
  under_review:   'Under review',
  docs_requested: 'Documents requested',
  approved:       'Approved',
  waitlisted:     'Waitlisted',
  rejected:       'Not approved',
  withdrawn:      'Withdrawn',
};
const STATUS_TINT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft:          'neutral',
  submitted:      'info',
  under_review:   'info',
  docs_requested: 'warning',
  approved:       'success',
  waitlisted:     'warning',
  rejected:       'danger',
  withdrawn:      'neutral',
};

const FUNDING_LABEL: Record<string, string> = {
  self_paying: 'Self-paying',
  nsfas:       'NSFAS',
  bursary:     'Bursary',
  partial:     'Partially funded',
};

export default function ApplicationDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: applicationKeys.detail(params.id),
    queryFn:  () => api.customer.getApplication(params.id),
    enabled:  !!session,
    retry:    false,
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={6} /></div>;

  if (!data) {
    // Surface the real cause instead of a bare "not found" — a 404 from the
    // backend genuinely means no matching application; anything else (network,
    // 500, etc.) is a different problem and shouldn't look identical to one.
    const apiError = error as ApiError | undefined;
    const isRealNotFound = apiError?.status === 404;
    return (
      <div data-page>
        <Link href="/applications" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
          <Icons.ChevronLeft size={16} /> Back to applications
        </Link>
        <div data-card-padded style={{ textAlign: 'center' }}>
          <Icons.FileText size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }} />
          <h1 data-page-title style={{ fontSize: '17px', marginBottom: 'var(--space-2)' }}>
            {isRealNotFound ? 'Application not found' : 'Couldn\u2019t load this application'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {isRealNotFound
              ? 'This application may have been withdrawn or the link is incorrect.'
              : (apiError?.message ?? 'Something went wrong loading this page. Please try again.')}
          </p>
        </div>
      </div>
    );
  }

  const app = data as Record<string, unknown>;
  const tenant  = (typeof app['tenantId'] === 'object' && app['tenantId'] !== null ? app['tenantId'] : {}) as Record<string, unknown>;
  const room    = (typeof app['allocatedRoomId'] === 'object' && app['allocatedRoomId'] !== null ? app['allocatedRoomId'] : null) as Record<string, unknown> | null;
  const reviewer = (typeof app['reviewedBy'] === 'object' && app['reviewedBy'] !== null ? app['reviewedBy'] : null) as Record<string, unknown> | null;

  const status         = (app['status'] as string) ?? 'submitted';
  const propertyName   = (app['propertyName'] as string) ?? (tenant['name'] as string) ?? 'Property';
  const coverImage     = (app['coverImage'] as string) ?? (tenant['coverImage'] as string) ?? null;
  const applicationId  = app['applicationId'] as string;
  const submittedAt    = app['submittedAt'] as string | undefined;
  const documents      = (app['submittedDocuments'] as Record<string, unknown>[]) ?? [];
  const answers        = (app['answers'] as Record<string, unknown>) ?? {};
  const roomTypePrefs  = (app['roomTypePreference'] as string[]) ?? [];
  const hasPreferences = roomTypePrefs.length > 0 || Boolean(app['specialNeeds']) || Boolean(app['dietaryRequirements']);
  const hasGuardian    = Boolean(app['guardianName']);
  const hasAnswers     = Object.keys(answers).length > 0;

  return (
    <div data-page>
      <Link href="/applications" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <Icons.ChevronLeft size={16} /> Back to applications
      </Link>

      {/* Header */}
      <div data-card-padded style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
        <div style={{ aspectRatio: '16/7', background: 'var(--color-bg-sunk)' }}>
          {coverImage && (
            <img src={coverImage} alt={propertyName} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>
        <div style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700 }}>{propertyName}</h1>
            <StatusPill status={status} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
            <span>Application ID: <strong style={{ color: 'var(--color-text)' }}>{applicationId ?? '—'}</strong></span>
            {submittedAt && (
              <span>Submitted {new Date(submittedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Status-specific banner */}
      <StatusBanner app={app} room={room} reviewer={reviewer} />

      {/* Applicant */}
      <Section title="Applicant">
        <Field label="Name" value={`${app['applicantFirstName'] ?? ''} ${app['applicantLastName'] ?? ''}`.trim()} />
        <Field label="Email" value={app['applicantEmail'] as string | undefined} />
        {app['applicantPhone'] != null && <Field label="Phone" value={app['applicantPhone'] as string} />}
      </Section>

      {/* Academic */}
      <Section title="Academic details">
        <Field label="Institution" value={app['institutionName'] as string | undefined} />
        {app['studentNumber'] != null && <Field label="Student number" value={app['studentNumber'] as string} />}
        {app['faculty'] != null && <Field label="Faculty" value={app['faculty'] as string} />}
        {app['course'] != null && <Field label="Course" value={app['course'] as string} />}
        {app['yearOfStudy'] != null && <Field label="Year of study" value={String(app['yearOfStudy'])} />}
        <Field label="Academic year" value={app['academicYear'] as string | undefined} />
      </Section>

      {/* Funding */}
      <Section title="Funding">
        <Field label="Funding type" value={FUNDING_LABEL[app['fundingType'] as string] ?? (app['fundingType'] as string)} />
        {app['bursaryFunder'] != null && <Field label="Bursary funder" value={app['bursaryFunder'] as string} />}
        {app['nsfasReferenceNumber'] != null && <Field label="NSFAS reference" value={app['nsfasReferenceNumber'] as string} />}
      </Section>

      {/* Preferences */}
      {hasPreferences && (
        <Section title="Preferences">
          {roomTypePrefs.length > 0 && <Field label="Room type preference" value={roomTypePrefs.join(', ')} />}
          {app['specialNeeds'] != null && <Field label="Special needs" value={app['specialNeeds'] as string} />}
          {app['dietaryRequirements'] != null && <Field label="Dietary requirements" value={app['dietaryRequirements'] as string} />}
        </Section>
      )}

      {/* Guardian */}
      {hasGuardian && (
        <Section title="Guardian / next of kin">
          <Field label="Name" value={app['guardianName'] as string | undefined} />
          {app['guardianRelationship'] != null && <Field label="Relationship" value={app['guardianRelationship'] as string} />}
          {app['guardianPhone'] != null && <Field label="Phone" value={app['guardianPhone'] as string} />}
          {app['guardianEmail'] != null && <Field label="Email" value={app['guardianEmail'] as string} />}
        </Section>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Section title="Documents">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {documents.map((doc, i) => {
              const uploaded = Boolean(doc['url']);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-sunk)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {uploaded
                      ? <Icons.CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                      : <Icons.AlertTriangle size={16} style={{ color: doc['docRequired'] ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />}
                    <span style={{ fontSize: '13px' }}>{doc['docLabel'] as string}</span>
                  </div>
                  {uploaded ? (
                    <a href={doc['url'] as string} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>View</a>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{doc['docRequired'] ? 'Required' : 'Optional'} · Not uploaded</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Custom form answers */}
      {hasAnswers && (
        <Section title="Your responses">
          {Object.entries(answers).map(([label, value]) => (
            <Field key={label} label={label} value={String(value)} />
          ))}
        </Section>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
        <Link href={`/applications/${params.id}/chat`} data-btn-primary style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
          <Icons.MessageCircle size={16} /> Contact property
        </Link>
      </div>
    </div>
  );
}

// ─── Small building blocks ─────────────────────────────────────────────────

function StatusPill({ status }: { status: string }): React.ReactElement {
  const tint = STATUS_TINT[status] ?? 'neutral';
  const colorVar = { success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)', info: 'var(--color-primary)', neutral: 'var(--color-text-muted)' }[tint];
  const bgVar    = { success: 'var(--color-success-bg)', warning: 'var(--color-warning-bg)', danger: 'var(--color-danger-bg)', info: 'var(--color-primary-tint)', neutral: 'var(--color-bg-sunk)' }[tint];
  return (
    <span style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-pill)', background: bgVar, color: colorVar, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div data-card-padded style={{ marginBottom: 'var(--space-4)' }}>
      <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--space-3)' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }): React.ReactElement | null {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: '13px' }}>
      <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function StatusBanner({ app, room, reviewer }: {
  app: Record<string, unknown>;
  room: Record<string, unknown> | null;
  reviewer: Record<string, unknown> | null;
}): React.ReactElement | null {
  const status = app['status'] as string;

  if (status === 'docs_requested') {
    return (
      <div data-card-padded style={{ marginBottom: 'var(--space-4)', background: 'var(--color-warning-bg)', display: 'flex', gap: 'var(--space-3)' }}>
        <Icons.AlertTriangle size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        <div>
          <strong style={{ fontSize: '13.5px' }}>Documents requested</strong>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {(app['docsRequestedNote'] as string) ?? 'The property needs additional documents from you — see below.'}
          </p>
        </div>
      </div>
    );
  }
  if (status === 'approved') {
    return (
      <div data-card-padded style={{ marginBottom: 'var(--space-4)', background: 'var(--color-success-bg)', display: 'flex', gap: 'var(--space-3)' }}>
        <Icons.CheckCircle2 size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        <div>
          <strong style={{ fontSize: '13.5px' }}>Application approved</strong>
          {room && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Allocated to Room {room['roomNumber'] as string}{room['type'] ? ` (${room['type']})` : ''}
              {room['floor'] != null ? `, Floor ${room['floor']}` : ''}.
            </p>
          )}
          {app['approvalNotes'] != null && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 2 }}>{app['approvalNotes'] as string}</p>
          )}
        </div>
      </div>
    );
  }
  if (status === 'waitlisted') {
    return (
      <div data-card-padded style={{ marginBottom: 'var(--space-4)', background: 'var(--color-warning-bg)', display: 'flex', gap: 'var(--space-3)' }}>
        <Icons.Clock size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        <div>
          <strong style={{ fontSize: '13.5px' }}>On the waitlist</strong>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {app['waitlistPosition'] != null ? `You're currently #${app['waitlistPosition']} on the waitlist.` : 'You\u2019ll be notified if a space becomes available.'}
          </p>
        </div>
      </div>
    );
  }
  if (status === 'rejected' && app['rejectionReason'] != null) {
    return (
      <div data-card-padded style={{ marginBottom: 'var(--space-4)', background: 'var(--color-danger-bg)', display: 'flex', gap: 'var(--space-3)' }}>
        <Icons.XCircle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
        <div>
          <strong style={{ fontSize: '13.5px' }}>Application not approved</strong>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 2 }}>{app['rejectionReason'] as string}</p>
        </div>
      </div>
    );
  }
  if ((status === 'under_review' || status === 'submitted') && reviewer) {
    return (
      <div data-card-padded style={{ marginBottom: 'var(--space-4)', background: 'var(--color-primary-tint)', display: 'flex', gap: 'var(--space-3)' }}>
        <Icons.Clock size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div>
          <strong style={{ fontSize: '13.5px' }}>Being reviewed</strong>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {reviewer['firstName'] as string} {reviewer['lastName'] as string} is reviewing your application.
          </p>
        </div>
      </div>
    );
  }
  return null;
}
