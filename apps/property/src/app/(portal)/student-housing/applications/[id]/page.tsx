'use client';

/**
 * Student Housing → Applications → single application review.
 *
 * Any status can move to any other (see applications.service.js#updateStatus
 * — no state-machine guard, just conditional required fields: rejectionReason
 * for 'rejected', optional approvalNotes/waitlistPosition for the other two).
 * The action bar below reflects that: all three review actions are offered
 * together whenever the application isn't already in a terminal state,
 * rather than forcing a submitted -> under_review -> decision sequence the
 * backend doesn't actually require.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  RoleGate, PlanGate, SkeletonLoader, EmptyState, StatusBadge,
  ReadOnlyField, InlineError, useToast, Icons,
} from '@stayos/ui';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { universityKeys } from '@/lib/query-keys';

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const TERMINAL_STATUSES = ['approved', 'waitlisted', 'rejected', 'withdrawn'];

type Mode = null | 'reject' | 'waitlist' | 'docs';

function ApplicationDetailInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: application, isLoading } = useQuery({
    queryKey: universityKeys.application(id),
    queryFn: () => api.university.getApplication(id),
  });

  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: universityKeys.application(id) });
    void queryClient.invalidateQueries({ queryKey: ['university', 'applications'] });
  };

  const statusMutation = useMutation({
    mutationFn: (input: Parameters<typeof api.university.updateApplicationStatus>[1]) =>
      api.university.updateApplicationStatus(id, input),
    onSuccess: () => {
      invalidate();
      setMode(null);
      setNote('');
      setNoteError(undefined);
      toast('Application updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not update the application.', 'error'),
  });

  const docsMutation = useMutation({
    mutationFn: (docsNote: string) => api.university.requestApplicationDocs(id, docsNote),
    onSuccess: () => {
      invalidate();
      setMode(null);
      setNote('');
      setNoteError(undefined);
      toast('Requested more documents from the applicant.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not send the request.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={8} />;
  if (!application) {
    return (
      <EmptyState
        title="Application not found"
        description="It may have been withdrawn."
        action={<Link href="/student-housing/applications" data-btn-primary>Back to applications</Link>}
      />
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(application.status);
  const pending = statusMutation.isPending || docsMutation.isPending;

  return (
    <div data-page="student-housing-application-detail">
      <div data-page-header>
        <div>
          <Link href="/student-housing/applications" data-breadcrumb>
            <Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Applications
          </Link>
          <h1>{application.applicantFirstName} {application.applicantLastName}</h1>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div data-detail-grid>
        <section data-detail-section>
          <h2>Applicant</h2>
          <ReadOnlyField label="Name" value={`${application.applicantFirstName} ${application.applicantLastName}`} />
          <ReadOnlyField label="Email" value={application.applicantEmail} />
          {application.applicantPhone && <ReadOnlyField label="Phone" value={application.applicantPhone} />}
          <ReadOnlyField label="Institution" value={application.institutionName} />
          {application.studentNumber && <ReadOnlyField label="Student number" value={application.studentNumber} />}
          {application.faculty && <ReadOnlyField label="Faculty" value={application.faculty} />}
          {application.course && <ReadOnlyField label="Course" value={application.course} />}
          {application.yearOfStudy != null && <ReadOnlyField label="Year of study" value={application.yearOfStudy} />}
          <ReadOnlyField label="Academic year" value={application.academicYear} />
        </section>

        <section data-detail-section>
          <h2>Funding &amp; housing</h2>
          <ReadOnlyField label="Funding type" value={application.fundingType.replace(/_/g, ' ')} />
          {application.bursaryFunder && <ReadOnlyField label="Bursary funder" value={application.bursaryFunder} />}
          {application.nsfasReferenceNumber && <ReadOnlyField label="NSFAS reference" value={application.nsfasReferenceNumber} />}
          {application.roomTypePreference.length > 0 && (
            <ReadOnlyField label="Room type preference" value={application.roomTypePreference.join(', ')} />
          )}
          {application.specialNeeds && <ReadOnlyField label="Special needs" value={application.specialNeeds} />}
          {application.dietaryRequirements && <ReadOnlyField label="Dietary requirements" value={application.dietaryRequirements} />}
          <ReadOnlyField label="Submitted" value={fmtDate(application.submittedAt)} />
          {application.reviewedAt && (
            <ReadOnlyField
              label="Reviewed"
              value={`${fmtDate(application.reviewedAt)}${application.reviewedBy ? ` by ${application.reviewedBy.firstName} ${application.reviewedBy.lastName}` : ''}`}
            />
          )}
          {application.status === 'rejected' && application.rejectionReason && (
            <ReadOnlyField label="Rejection reason" value={application.rejectionReason} />
          )}
          {application.status === 'waitlisted' && application.waitlistPosition != null && (
            <ReadOnlyField label="Waitlist position" value={application.waitlistPosition} />
          )}
          {application.approvalNotes && <ReadOnlyField label="Approval notes" value={application.approvalNotes} />}
        </section>

        <section data-detail-section>
          <h2>Documents</h2>
          {application.submittedDocuments.length === 0 ? (
            <p data-empty-note>No documents submitted yet.</p>
          ) : (
            <ul>
              {application.submittedDocuments.map((doc) => (
                <li key={doc.docLabel}>
                  {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer">{doc.docLabel}</a> : doc.docLabel}
                  {!doc.url && doc.docRequired && <span data-optional> (not yet uploaded)</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!isTerminal && (
        <div data-form-actions>
          <button
            type="button" data-btn-primary
            disabled={pending}
            onClick={() => statusMutation.mutate({ status: 'approved' })}
          >
            Approve
          </button>
          <button
            type="button" data-btn-ghost
            disabled={pending}
            onClick={() => { setMode('waitlist'); setNote(''); setNoteError(undefined); }}
          >
            Waitlist
          </button>
          <button
            type="button" data-btn-ghost
            disabled={pending}
            onClick={() => { setMode('docs'); setNote(''); setNoteError(undefined); }}
          >
            Request documents
          </button>
          <button
            type="button" data-btn-ghost data-destructive
            disabled={pending}
            onClick={() => { setMode('reject'); setNote(''); setNoteError(undefined); }}
          >
            Reject
          </button>
        </div>
      )}

      {mode === 'reject' && (
        <div data-detail-section>
          <label htmlFor="app-note">Reason for rejection</label>
          <textarea id="app-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          <InlineError message={noteError} />
          <div data-form-actions>
            <button type="button" data-btn-ghost onClick={() => setMode(null)}>Cancel</button>
            <button
              type="button" data-btn-primary data-destructive
              disabled={pending}
              onClick={() => {
                const reason = note.trim();
                if (!reason) { setNoteError('A reason is required.'); return; }
                statusMutation.mutate({ status: 'rejected', rejectionReason: reason });
              }}
            >
              {statusMutation.isPending ? 'Rejecting…' : 'Confirm rejection'}
            </button>
          </div>
        </div>
      )}

      {mode === 'waitlist' && (
        <div data-detail-section>
          <label htmlFor="app-note">Waitlist position (optional)</label>
          <input
            id="app-note" type="number" min={1}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div data-form-actions>
            <button type="button" data-btn-ghost onClick={() => setMode(null)}>Cancel</button>
            <button
              type="button" data-btn-primary
              disabled={pending}
              onClick={() => {
                const position = note.trim() ? Number(note.trim()) : undefined;
                statusMutation.mutate({ status: 'waitlisted', ...(position ? { waitlistPosition: position } : {}) });
              }}
            >
              {statusMutation.isPending ? 'Saving…' : 'Confirm waitlist'}
            </button>
          </div>
        </div>
      )}

      {mode === 'docs' && (
        <div data-detail-section>
          <label htmlFor="app-note">What documents are needed?</label>
          <textarea id="app-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          <InlineError message={noteError} />
          <div data-form-actions>
            <button type="button" data-btn-ghost onClick={() => setMode(null)}>Cancel</button>
            <button
              type="button" data-btn-primary
              disabled={pending}
              onClick={() => {
                const docsNote = note.trim();
                if (!docsNote) { setNoteError('Describe what is needed.'); return; }
                docsMutation.mutate(docsNote);
              }}
            >
              {docsMutation.isPending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicationDetailPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.PROPERTY_ALL}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this page." />}
    >
      <PlanGate feature={PLAN_FEATURES.UNIVERSITY_MODULE}>
        <ApplicationDetailInner />
      </PlanGate>
    </RoleGate>
  );
}
