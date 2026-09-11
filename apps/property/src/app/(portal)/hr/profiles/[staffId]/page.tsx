'use client';

import Link from 'next/link';

/**
 * HR profile — TAD 11 §12.
 * Permission split:
 *   staff:manage      → create/update profile, upload/delete docs, create
 *                        disciplinary/performance records
 *   (no permission)   → a staff member can view their own profile and
 *                        acknowledge a disciplinary/performance record
 *                        concerning them (self-action only — a manager
 *                        cannot acknowledge on behalf of a subordinate).
 *
 * Payroll export (timesheets) lives in the consolidated /roster page now.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, StatusBadge, ReadOnlyField, RoleGate, useToast,
  Modal, InlineError, applyServerErrors, ConfirmDialog, DownloadButton, Icons,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { useSession } from '@stayos/auth';
import { hrKeys, staffKeys } from '@/lib/query-keys';

// Must match the backend exactly (src/modules/hr/hr.validation.js).
const EMPLOYMENT_TYPES = ['permanent', 'fixed_term', 'part_time', 'casual'] as const;
const DOC_TYPES = ['employment_contract', 'id_document', 'work_permit', 'qualification', 'training_certificate', 'disciplinary_record', 'other'] as const;
const DISC_TYPES = ['verbal_warning', 'written_warning', 'final_warning', 'suspension', 'dismissal', 'note'] as const;
const RATINGS = ['exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory'] as const;

const DOC_TYPE_LABELS: Record<(typeof DOC_TYPES)[number], string> = {
  employment_contract: 'Employment contract', id_document: 'ID document', work_permit: 'Work permit',
  qualification: 'Qualification', training_certificate: 'Training certificate',
  disciplinary_record: 'Disciplinary record', other: 'Other',
};
const DISC_TYPE_LABELS: Record<(typeof DISC_TYPES)[number], string> = {
  verbal_warning: 'Verbal warning', written_warning: 'Written warning', final_warning: 'Final written warning',
  suspension: 'Suspension', dismissal: 'Dismissal', note: 'Note',
};
const RATING_LABELS: Record<(typeof RATINGS)[number], string> = {
  exceeds_expectations: 'Exceeds expectations', meets_expectations: 'Meets expectations',
  needs_improvement: 'Needs improvement', unsatisfactory: 'Unsatisfactory',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

const profileSchema = z.object({
  employmentType:      z.enum(EMPLOYMENT_TYPES, { errorMap: () => ({ message: 'Select an employment type' }) }),
  startDate:           z.string().min(1, 'Start date is required'),
  estimatedHourlyRate: z.coerce.number().positive().optional(),
  externalPayrollRef:  z.string().optional(),
});
type ProfileInput = z.infer<typeof profileSchema>;

const disciplinarySchema = z.object({
  type:         z.enum(DISC_TYPES, { errorMap: () => ({ message: 'Select a type' }) }),
  reason:       z.string().min(1, 'Reason is required'),
  incidentDate: z.string().min(1, 'Incident date is required'),
});
type DisciplinaryInput = z.infer<typeof disciplinarySchema>;

const performanceSchema = z.object({
  period:              z.string().min(1, 'Period is required'),
  rating:              z.enum(RATINGS, { errorMap: () => ({ message: 'Select a rating' }) }),
  strengths:           z.string().optional(),
  areasForImprovement: z.string().optional(),
  goals:               z.string().optional(),
});
type PerformanceInput = z.infer<typeof performanceSchema>;

type Tab = 'profile' | 'documents' | 'disciplinary' | 'performance';

export default function HrProfilePage(): React.ReactElement {
  const params = useParams<{ staffId: string }>();
  const staffId = params.staffId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const [tab, setTab] = useState<Tab>('profile');
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [showNewDisc, setShowNewDisc] = useState(false);
  const [showNewReview, setShowNewReview] = useState(false);
  const [ackDiscId, setAckDiscId] = useState<string | null>(null);
  const [ackReviewId, setAckReviewId] = useState<string | null>(null);
  const [probationStatus, setProbationStatus] = useState('');

  const isSelf = session?.userId === staffId;

  const { data: staffMember } = useQuery({
    queryKey: staffKeys.detail(staffId),
    queryFn: () => api.staff.get(staffId),
    staleTime: 120_000,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: hrKeys.profile(staffId),
    queryFn: () => api.hr.getProfile(staffId),
  });

  const { data: documents } = useQuery({
    queryKey: hrKeys.documents(staffId),
    queryFn: () => api.hr.listDocuments(staffId),
    enabled: tab === 'documents',
  });

  const { data: disciplinaryRecords } = useQuery({
    queryKey: hrKeys.disciplinary(staffId),
    queryFn: () => api.hr.listDisciplinary(staffId),
    enabled: tab === 'disciplinary',
  });

  const { data: reviews } = useQuery({
    queryKey: hrKeys.performance(staffId),
    queryFn: () => api.hr.listPerformance(staffId),
    enabled: tab === 'performance',
  });

  // ── Profile ──────────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });

  const createProfileMutation = useMutation({
    mutationFn: (input: ProfileInput) => api.hr.createProfile(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.profile(staffId) });
      setShowNewProfile(false);
      profileForm.reset();
      toast('HR profile created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(profileForm, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to create profile.', 'error');
      }
    },
  });

  const probationMutation = useMutation({
    mutationFn: (status: string) => api.hr.probationReview(staffId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.profile(staffId) });
      setProbationStatus('');
      toast('Probation review recorded.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  // ── Documents ────────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: ({ file, label, type }: { file: File; label: string; type: string }) => {
      const fd = new FormData();
      fd.append('document', file);
      if (label) fd.append('label', label);
      fd.append('type', type);
      return api.hr.uploadDocument(staffId, fd);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.documents(staffId) });
      toast('Document uploaded.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Upload failed.', 'error'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => api.hr.deleteDocument(docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.documents(staffId) });
      toast('Document deleted.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  // ── Disciplinary ─────────────────────────────────────────────────────────
  const discForm = useForm<DisciplinaryInput>({ resolver: zodResolver(disciplinarySchema) });

  const createDiscMutation = useMutation({
    mutationFn: (input: DisciplinaryInput) => api.hr.createDisciplinary(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.disciplinary(staffId) });
      setShowNewDisc(false);
      discForm.reset();
      toast('Disciplinary record created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(discForm, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed.', 'error');
      }
    },
  });

  const ackDiscMutation = useMutation({
    mutationFn: (id: string) => api.hr.acknowledgeDisciplinary(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.disciplinary(staffId) });
      setAckDiscId(null);
      toast('Record acknowledged.', 'success');
    },
    onError: (err: ApiError) => { setAckDiscId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  // ── Performance ──────────────────────────────────────────────────────────
  const reviewForm = useForm<PerformanceInput>({ resolver: zodResolver(performanceSchema) });

  const createReviewMutation = useMutation({
    mutationFn: (input: PerformanceInput) => api.hr.createPerformance(staffId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.performance(staffId) });
      setShowNewReview(false);
      reviewForm.reset();
      toast('Performance review recorded.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(reviewForm, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed.', 'error');
      }
    },
  });

  const ackReviewMutation = useMutation({
    mutationFn: (id: string) => api.hr.acknowledgePerformance(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.performance(staffId) });
      setAckReviewId(null);
      toast('Review acknowledged.', 'success');
    },
    onError: (err: ApiError) => { setAckReviewId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  if (profileLoading) return <SkeletonLoader rows={5} />;

  const name = staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Staff member';

  return (
    <div data-page="hr-profile">
      <div data-page-header>
        <div>
          <Link href="/roster" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Roster &amp; HR</Link>
          <h1>{name}</h1>
          {staffMember && <p data-page-subtitle>{staffMember.role.replace(/_/g, ' ')}</p>}
        </div>
        {staffMember && <StatusBadge status={staffMember.status} />}
      </div>

      <div data-tab-bar role="tablist">
        {(['profile', 'documents', 'disciplinary', 'performance'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            data-tab data-active={tab === t || undefined} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <section data-detail-section>
          <h2>HR profile</h2>
          {!profile ? (
            <div data-empty-note>
              <p>No HR profile created yet.</p>
              <RoleGate perm={[PERMISSIONS.HR_PROFILE_MANAGE, PERMISSIONS.STAFF_MANAGE]}>
                <button type="button" data-btn-primary data-btn-sm onClick={() => setShowNewProfile(true)}>
                  Create HR profile
                </button>
              </RoleGate>
            </div>
          ) : (
            <>
              <div data-field-list>
                <ReadOnlyField label="Employment type" value={profile.employmentType.replace(/_/g, ' ')} />
                <ReadOnlyField label="Start date" value={fmtDate(profile.startDate)} />
                {profile.endDate && <ReadOnlyField label="End date" value={fmtDate(profile.endDate)} />}
                {profile.estimatedHourlyRate != null && (
                  <ReadOnlyField label="Estimated hourly rate" value={`R${profile.estimatedHourlyRate}/h`} />
                )}
                {profile.externalPayrollRef && (
                  <ReadOnlyField label="Payroll system ref" value={profile.externalPayrollRef} />
                )}
                {profile.probation && (
                  <ReadOnlyField label="Probation" value={
                    profile.probation.status.replace(/_/g, ' ') +
                    (profile.probation.endDate ? ` (ends ${fmtDate(profile.probation.endDate)})` : '')
                  } />
                )}
              </div>

              {profile.probation?.status === 'active' && (
                <RoleGate perm={[PERMISSIONS.HR_PROBATION_MANAGE, PERMISSIONS.STAFF_MANAGE]}>
                  <div data-form-row data-probation-review>
                    <select value={probationStatus} onChange={(e) => setProbationStatus(e.target.value)}>
                      <option value="">Record probation outcome…</option>
                      <option value="passed">Passed</option>
                      <option value="extended">Extended</option>
                      <option value="failed">Failed</option>
                    </select>
                    <button type="button" data-btn-ghost data-btn-sm
                      disabled={!probationStatus || probationMutation.isPending}
                      onClick={() => probationMutation.mutate(probationStatus)}>
                      Save
                    </button>
                  </div>
                </RoleGate>
              )}
            </>
          )}
        </section>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <section data-detail-section>
          <div data-section-header>
            <h2>Documents</h2>
            <RoleGate perm={[PERMISSIONS.HR_DOCUMENT_MANAGE, PERMISSIONS.STAFF_MANAGE]}>
              <DocumentUploadControl onUpload={(file, label, type) => uploadMutation.mutate({ file, label, type })} />
            </RoleGate>
          </div>

          {!documents?.length ? (
            <p data-empty-note>No documents uploaded.</p>
          ) : (
            <div data-document-list>
              {documents.map((doc) => (
                <div key={doc._id} data-document-row>
                  <span data-doc-name>{doc.label}</span>
                  <span data-doc-type>{DOC_TYPE_LABELS[doc.type] ?? doc.type}</span>
                  <span data-doc-date>{fmtDate(doc.createdAt)}</span>
                  <div data-doc-actions>
                    <DownloadButton href={doc.cloudinaryUrl} filename={doc.label} label="Download" />
                    <RoleGate perm={[PERMISSIONS.HR_DOCUMENT_MANAGE, PERMISSIONS.STAFF_MANAGE]}>
                      <button type="button" data-btn-ghost data-btn-sm data-destructive
                        onClick={() => deleteDocMutation.mutate(doc._id)}>
                        Delete
                      </button>
                    </RoleGate>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Disciplinary tab */}
      {tab === 'disciplinary' && (
        <section data-detail-section>
          <div data-section-header>
            <h2>Disciplinary records</h2>
            <RoleGate perm={[PERMISSIONS.HR_DISCIPLINARY_MANAGE, PERMISSIONS.STAFF_MANAGE]}>
              <button type="button" data-btn-primary data-btn-sm onClick={() => setShowNewDisc(true)}>
                + Add record
              </button>
            </RoleGate>
          </div>

          {!disciplinaryRecords?.length ? (
            <p data-empty-note>No disciplinary records.</p>
          ) : (
            <div data-disciplinary-list>
              {disciplinaryRecords.map((rec) => (
                <div key={rec._id} data-disciplinary-card>
                  <div data-disc-header>
                    <span data-disc-type>{DISC_TYPE_LABELS[rec.type] ?? rec.type}</span>
                    <span data-disc-date>{fmtDate(rec.incidentDate)}</span>
                  </div>
                  <p data-disc-desc>{rec.reason}</p>
                  <div data-disc-footer>
                    {rec.employeeAcknowledged ? (
                      <span data-acknowledged-badge>
                        Acknowledged {rec.acknowledgedAt ? fmtDate(rec.acknowledgedAt) : ''}
                      </span>
                    ) : isSelf ? (
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => setAckDiscId(rec._id)}>
                        Acknowledge
                      </button>
                    ) : (
                      <span data-pending-ack>Awaiting acknowledgement from staff member</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Performance tab */}
      {tab === 'performance' && (
        <section data-detail-section>
          <div data-section-header>
            <h2>Performance reviews</h2>
            <RoleGate perm={[PERMISSIONS.HR_PERFORMANCE_MANAGE, PERMISSIONS.STAFF_MANAGE]}>
              <button type="button" data-btn-primary data-btn-sm onClick={() => setShowNewReview(true)}>
                + Add review
              </button>
            </RoleGate>
          </div>

          {!reviews?.length ? (
            <p data-empty-note>No performance reviews yet.</p>
          ) : (
            <div data-disciplinary-list>
              {reviews.map((rev) => (
                <div key={rev._id} data-disciplinary-card>
                  <div data-disc-header>
                    <span data-disc-type>{rev.period} — {RATING_LABELS[rev.rating] ?? rev.rating}</span>
                    <span data-disc-date>{fmtDate(rev.createdAt)}</span>
                  </div>
                  {rev.strengths && <p data-disc-desc><strong>Strengths:</strong> {rev.strengths}</p>}
                  {rev.areasForImprovement && <p data-disc-desc><strong>Areas for improvement:</strong> {rev.areasForImprovement}</p>}
                  {rev.goals && <p data-disc-desc><strong>Goals:</strong> {rev.goals}</p>}
                  <div data-disc-footer>
                    {rev.employeeAcknowledged ? (
                      <span data-acknowledged-badge>
                        Acknowledged {rev.acknowledgedAt ? fmtDate(rev.acknowledgedAt) : ''}
                      </span>
                    ) : isSelf ? (
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => setAckReviewId(rev._id)}>
                        Acknowledge
                      </button>
                    ) : (
                      <span data-pending-ack>Awaiting acknowledgement from staff member</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* New HR profile modal */}
      <Modal open={showNewProfile} onClose={() => setShowNewProfile(false)} title="Create HR profile">
        <form onSubmit={profileForm.handleSubmit((v) => createProfileMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="pf-type">Employment type</label>
            <select id="pf-type" defaultValue="" {...profileForm.register('employmentType')}>
              <option value="" disabled>Select…</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <InlineError message={profileForm.formState.errors.employmentType?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="pf-start">Start date</label>
            <input id="pf-start" type="date" {...profileForm.register('startDate')} />
            <InlineError message={profileForm.formState.errors.startDate?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="pf-rate">Est. hourly rate (ZAR) <span data-optional>(optional)</span></label>
              <input id="pf-rate" type="number" min={0} step="0.01" {...profileForm.register('estimatedHourlyRate')} />
            </div>
            <div data-form-group>
              <label htmlFor="pf-payroll">Payroll system ref <span data-optional>(optional)</span></label>
              <input id="pf-payroll" type="text" placeholder="e.g. SimplePay employee ID" {...profileForm.register('externalPayrollRef')} />
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewProfile(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createProfileMutation.isPending}>
              {createProfileMutation.isPending ? 'Creating…' : 'Create profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New disciplinary modal */}
      <Modal open={showNewDisc} onClose={() => setShowNewDisc(false)} title="Add disciplinary record">
        <form onSubmit={discForm.handleSubmit((v) => createDiscMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="disc-type">Type</label>
            <select id="disc-type" defaultValue="" {...discForm.register('type')}>
              <option value="" disabled>Select…</option>
              {DISC_TYPES.map((t) => <option key={t} value={t}>{DISC_TYPE_LABELS[t]}</option>)}
            </select>
            <InlineError message={discForm.formState.errors.type?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="disc-date">Incident date</label>
            <input id="disc-date" type="date" {...discForm.register('incidentDate')} />
            <InlineError message={discForm.formState.errors.incidentDate?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="disc-reason">Reason</label>
            <textarea id="disc-reason" rows={3} {...discForm.register('reason')} />
            <InlineError message={discForm.formState.errors.reason?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewDisc(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createDiscMutation.isPending}>
              {createDiscMutation.isPending ? 'Saving…' : 'Add record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New performance review modal */}
      <Modal open={showNewReview} onClose={() => setShowNewReview(false)} title="Add performance review">
        <form onSubmit={reviewForm.handleSubmit((v) => createReviewMutation.mutate(v))} noValidate data-form>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="rev-period">Period</label>
              <input id="rev-period" type="text" placeholder="e.g. 2026-Q3" {...reviewForm.register('period')} />
              <InlineError message={reviewForm.formState.errors.period?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="rev-rating">Rating</label>
              <select id="rev-rating" defaultValue="" {...reviewForm.register('rating')}>
                <option value="" disabled>Select…</option>
                {RATINGS.map((r) => <option key={r} value={r}>{RATING_LABELS[r]}</option>)}
              </select>
              <InlineError message={reviewForm.formState.errors.rating?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="rev-strengths">Strengths <span data-optional>(optional)</span></label>
            <textarea id="rev-strengths" rows={2} {...reviewForm.register('strengths')} />
          </div>
          <div data-form-group>
            <label htmlFor="rev-improve">Areas for improvement <span data-optional>(optional)</span></label>
            <textarea id="rev-improve" rows={2} {...reviewForm.register('areasForImprovement')} />
          </div>
          <div data-form-group>
            <label htmlFor="rev-goals">Goals <span data-optional>(optional)</span></label>
            <textarea id="rev-goals" rows={2} {...reviewForm.register('goals')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewReview(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createReviewMutation.isPending}>
              {createReviewMutation.isPending ? 'Saving…' : 'Add review'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!ackDiscId}
        title="Acknowledge this record?"
        message="By acknowledging, you confirm you have read and received this record. This is recorded and cannot be undone."
        confirmLabel="Acknowledge"
        cancelLabel="Cancel"
        onConfirm={() => { if (ackDiscId) ackDiscMutation.mutate(ackDiscId); }}
        onCancel={() => setAckDiscId(null)}
      />

      <ConfirmDialog
        open={!!ackReviewId}
        title="Acknowledge this review?"
        message="By acknowledging, you confirm you have read and discussed this review. This is recorded and cannot be undone."
        confirmLabel="Acknowledge"
        cancelLabel="Cancel"
        onConfirm={() => { if (ackReviewId) ackReviewMutation.mutate(ackReviewId); }}
        onCancel={() => setAckReviewId(null)}
      />
    </div>
  );
}

// A tiny standalone control so the label/type/file selection doesn't have to
// live in parent component state — keeps the upload one atomic action.
function DocumentUploadControl({ onUpload }: { onUpload: (file: File, label: string, type: string) => void }): React.ReactElement {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<(typeof DOC_TYPES)[number]>('other');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" data-btn-ghost data-btn-sm onClick={() => setOpen(true)}>
        Upload document
      </button>
    );
  }

  return (
    <div data-doc-upload-compose>
      <select value={type} onChange={(e) => setType(e.target.value as (typeof DOC_TYPES)[number])}>
        {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
      </select>
      <input type="text" placeholder="Label (optional — defaults to file name)"
        value={label} onChange={(e) => setLabel(e.target.value)} />
      <input type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onUpload(file, label, type);
          setOpen(false);
          setLabel('');
        }} />
      <button type="button" data-btn-ghost data-btn-sm onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
