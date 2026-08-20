'use client';

/**
 * HR profile — TAD 11 §12.
 * Permission split:
 *   staff:manage      → create/update profile, upload/delete docs, create disciplinary
 *   (no permission)   → a staff member can view their own profile and acknowledge
 *                       a disciplinary record concerning them (self-action only).
 *
 * A manager cannot acknowledge a disciplinary record on behalf of a subordinate
 * (TAD 11 §12 — explicitly noted as self-action only).
 *
 * Payroll export (timesheets) requires payroll_export:read.
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
  Modal, InlineError, applyServerErrors, ConfirmDialog,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { hrKeys, staffKeys } from '@/lib/query-keys';
import { useSession } from '@stayos/auth';

const disciplinarySchema = z.object({
  type:        z.string().min(1, 'Type required'),
  description: z.string().min(1, 'Description required'),
  date:        z.string().min(1, 'Date required'),
  outcome:     z.string().optional(),
});
type DisciplinaryInput = z.infer<typeof disciplinarySchema>;

export default function HrProfilePage(): React.ReactElement {
  const params = useParams<{ staffId: string }>();
  const staffId = params.staffId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const [tab, setTab] = useState<'profile' | 'documents' | 'disciplinary'>('profile');
  const [showNewDisc, setShowNewDisc] = useState(false);
  const [acknowledgeId, setAcknowledgeId] = useState<string | null>(null);

  // Current user ID for self-action guard
  const currentUserId = (session as unknown as Record<string, unknown> | null)?.['userId'] as string | undefined;
  const isSelf = currentUserId === staffId;

  const { data: staffMember } = useQuery({
    queryKey: staffKeys.detail(staffId),
    queryFn: () => api.staff.get(staffId),
    staleTime: 120_000,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: hrKeys.profile(staffId),
    queryFn: () => api.hr.getProfile(staffId),
    staleTime: 120_000,
  });

  const { data: documents } = useQuery({
    queryKey: hrKeys.documents(staffId),
    queryFn: () => api.hr.listDocuments(staffId),
    enabled: tab === 'documents',
    staleTime: 120_000,
  });

  const { data: disciplinaryRecords } = useQuery({
    queryKey: hrKeys.disciplinary(staffId),
    queryFn: () => api.hr.listDisciplinary(staffId),
    enabled: tab === 'disciplinary',
    staleTime: 120_000,
  });

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
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(discForm, err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.hr.acknowledgeDisciplinary(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.disciplinary(staffId) });
      setAcknowledgeId(null);
      toast('Record acknowledged.', 'success');
    },
    onError: (err: ApiError) => {
      setAcknowledgeId(null);
      toast(err.message ?? 'Failed.', 'error');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => api.hr.deleteDocument(docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.documents(staffId) });
      toast('Document deleted.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (profileLoading) return <SkeletonLoader rows={5} />;

  const name = staffMember
    ? `${staffMember.firstName} ${staffMember.lastName}`
    : 'Staff member';
  const p = profile as unknown as Record<string, unknown> ?? {};

  return (
    <div data-page="hr-profile">
      <div data-page-header>
        <div>
          <a href="/hr" data-breadcrumb>← HR</a>
          <h1>{name}</h1>
          {staffMember && (
            <p data-page-subtitle>{staffMember.role.replace(/_/g, ' ')}</p>
          )}
        </div>
        {staffMember && <StatusBadge status={staffMember.status} />}
      </div>

      <div data-tab-bar role="tablist">
        {(['profile', 'documents', 'disciplinary'] as const).map((t) => (
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
              <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
                <button type="button" data-btn-primary data-btn-sm
                  onClick={() => {
                    void api.hr.createProfile(staffId, {}).then(() => {
                      void queryClient.invalidateQueries({ queryKey: hrKeys.profile(staffId) });
                      toast('Profile created.', 'success');
                    });
                  }}>
                  Create HR profile
                </button>
              </RoleGate>
            </div>
          ) : (
            <div data-field-list>
              {p['startDate'] && (
                <ReadOnlyField label="Start date"
                  value={new Date(String(p['startDate'])).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} />
              )}
              {p['jobTitle'] && <ReadOnlyField label="Job title" value={String(p['jobTitle'])} />}
              {p['bankName'] && <ReadOnlyField label="Bank" value={String(p['bankName'])} />}
              {p['employmentType'] && (
                <ReadOnlyField label="Employment type" value={String(p['employmentType'])} />
              )}
              {p['onProbation'] != null && (
                <ReadOnlyField label="Probation" value={p['onProbation'] ? 'Yes' : 'No'} />
              )}
            </div>
          )}
        </section>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <section data-detail-section>
          <div data-section-header>
            <h2>Documents</h2>
            <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
              <label data-btn-ghost data-btn-sm data-file-upload-label>
                Upload document
                <input type="file" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                      await api.hr.uploadDocument(staffId, fd);
                      void queryClient.invalidateQueries({ queryKey: hrKeys.documents(staffId) });
                      toast('Document uploaded.', 'success');
                    } catch {
                      toast('Upload failed.', 'error');
                    }
                  }} />
              </label>
            </RoleGate>
          </div>

          {!documents?.length ? (
            <p data-empty-note>No documents uploaded.</p>
          ) : (
            <div data-document-list>
              {documents.map((doc) => {
                const d = doc as unknown as Record<string, unknown>;
                const docId = String(d['_id']);
                return (
                  <div key={docId} data-document-row>
                    <span data-doc-name>{String(d['filename'] ?? d['name'] ?? 'Document')}</span>
                    <span data-doc-date>
                      {d['createdAt'] ? new Date(String(d['createdAt'])).toLocaleDateString('en-ZA') : ''}
                    </span>
                    <div data-doc-actions>
                      {d['url'] && (
                        <a href={String(d['url'])} target="_blank" rel="noopener noreferrer"
                          data-btn-ghost data-btn-sm>Download</a>
                      )}
                      <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
                        <button type="button" data-btn-ghost data-btn-sm data-destructive
                          onClick={() => deleteDocMutation.mutate(docId)}>
                          Delete
                        </button>
                      </RoleGate>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Disciplinary tab */}
      {tab === 'disciplinary' && (
        <section data-detail-section>
          <div data-section-header>
            <h2>Disciplinary records</h2>
            <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
              <button type="button" data-btn-primary data-btn-sm
                onClick={() => setShowNewDisc(true)}>
                + Add record
              </button>
            </RoleGate>
          </div>

          {!disciplinaryRecords?.length ? (
            <p data-empty-note>No disciplinary records.</p>
          ) : (
            <div data-disciplinary-list>
              {disciplinaryRecords.map((rec) => {
                const r = rec as unknown as Record<string, unknown>;
                const recId = String(r['_id']);
                const acknowledged = Boolean(r['acknowledgedAt']);
                return (
                  <div key={recId} data-disciplinary-card>
                    <div data-disc-header>
                      <span data-disc-type>{String(r['type'] ?? '—')}</span>
                      <span data-disc-date>
                        {r['date'] ? new Date(String(r['date'])).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <p data-disc-desc>{String(r['description'] ?? '')}</p>
                    {r['outcome'] && <p data-disc-outcome><strong>Outcome:</strong> {String(r['outcome'])}</p>}
                    <div data-disc-footer>
                      {acknowledged ? (
                        <span data-acknowledged-badge>
                          Acknowledged {r['acknowledgedAt'] ? new Date(String(r['acknowledgedAt'])).toLocaleDateString('en-ZA') : ''}
                        </span>
                      ) : isSelf ? (
                        // Self-action only — a manager cannot acknowledge on behalf of a subordinate
                        <button type="button" data-btn-ghost data-btn-sm
                          onClick={() => setAcknowledgeId(recId)}>
                          Acknowledge
                        </button>
                      ) : (
                        <span data-pending-ack>Awaiting acknowledgement from staff member</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* New disciplinary modal */}
      <Modal open={showNewDisc} onClose={() => setShowNewDisc(false)} title="Add disciplinary record">
        <form onSubmit={discForm.handleSubmit((v) => createDiscMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="disc-type">Type</label>
            <select id="disc-type" {...discForm.register('type')}>
              <option value="">Select…</option>
              <option value="verbal_warning">Verbal warning</option>
              <option value="written_warning">Written warning</option>
              <option value="final_warning">Final written warning</option>
              <option value="suspension">Suspension</option>
              <option value="dismissal">Dismissal</option>
            </select>
            <InlineError message={discForm.formState.errors.type?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="disc-date">Date</label>
            <input id="disc-date" type="date" {...discForm.register('date')} />
            <InlineError message={discForm.formState.errors.date?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="disc-desc">Description</label>
            <textarea id="disc-desc" rows={3} {...discForm.register('description')} />
            <InlineError message={discForm.formState.errors.description?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="disc-outcome">Outcome <span data-optional>(optional)</span></label>
            <input id="disc-outcome" type="text" {...discForm.register('outcome')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewDisc(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createDiscMutation.isPending}>
              {createDiscMutation.isPending ? 'Saving…' : 'Add record'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!acknowledgeId}
        title="Acknowledge this record?"
        message="By acknowledging, you confirm you have read and received this record. This is recorded and cannot be undone."
        confirmLabel="Acknowledge"
        cancelLabel="Cancel"
        onConfirm={() => { if (acknowledgeId) acknowledgeMutation.mutate(acknowledgeId); }}
        onCancel={() => setAcknowledgeId(null)}
      />
    </div>
  );
}
