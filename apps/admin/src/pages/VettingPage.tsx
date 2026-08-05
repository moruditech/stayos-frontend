import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  approveApplicationSchema,
  rejectApplicationSchema,
  requestDocsSchema,
  flagApplicationSchema,
} from '@stayos/validators';
import type {
  ApproveApplicationInput,
  RejectApplicationInput,
  RequestDocsInput,
  FlagApplicationInput,
} from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, useToast, Modal, Icons } from '@stayos/ui';
import { vettingKeys } from '../lib/query-keys';
import { formatDate, formatDateTime, titleCase } from '../lib/format';

export default function VettingPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  if (id) return <ApplicationDetailView id={id} />;
  if (location.pathname === '/vetting/applications') return <ApplicationListView allStatuses />;
  return <ApplicationListView allStatuses={false} />;
}

function ApplicationListView({ allStatuses }: { allStatuses: boolean }): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('all');
  const [type, setType] = React.useState('all');

  const pendingQuery = useQuery({
    queryKey: vettingKeys.pending({ page }),
    queryFn: () => api.vetting.getPending({ page, limit: 20 }),
    enabled: !allStatuses,
  });
  const allQuery = useQuery({
    queryKey: vettingKeys.applications({ page, status, type }),
    queryFn: () => api.vetting.listAll({ page, limit: 20, status: status === 'all' ? undefined : status, applicantType: type === 'all' ? undefined : type }),
    enabled: allStatuses,
  });

  const { data, isLoading } = allStatuses ? allQuery : pendingQuery;

  return (
    <div>
      <PageHeader
        title={allStatuses ? 'All Applications' : 'Vetting Queue'}
        subtitle={allStatuses ? 'Every property and agency application, any status.' : 'Applications needing review right now.'}
        actions={
          <button data-btn-secondary onClick={() => navigate(allStatuses ? '/vetting' : '/vetting/applications')}>
            {allStatuses ? <><Icons.ClipboardList /> View Queue Only</> : <><Icons.FileText /> View All Applications</>}
          </button>
        }
      />

      {allStatuses ? (
        <div data-filter-bar>
          <label data-filter-select>
            <span>Status</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="started">Started</option>
              <option value="documents_submitted">Documents submitted</option>
              <option value="under_review">Under review</option>
              <option value="documents_requested">Documents requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </label>
          <label data-filter-select>
            <span>Type</span>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="property_owner">Property</option>
              <option value="agency">Agency</option>
              <option value="multi_property_owner">Multi-property owner</option>
            </select>
          </label>
        </div>
      ) : null}

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.ClipboardList} title={allStatuses ? 'No applications found' : 'Nothing in the queue'} description={allStatuses ? undefined : 'New submissions will appear here.'} />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Applicant</th><th>Type</th><th>Submitted</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.data.map((a) => (
                    <tr key={a._id} data-clickable onClick={() => navigate(`/vetting/applications/${a._id}`)}>
                      <td>
                        <div data-cell-entity-name>
                          {a.applicantType === 'agency' ? a.businessName || a.applicantName : a.propertyName || a.applicantName}
                        </div>
                        <div data-cell-entity-sub>{a.propertyCity ?? a.applicantEmail}</div>
                      </td>
                      <td><span data-status-badge data-status={a.applicantType === 'agency' ? 'agency' : 'property'}>{a.applicantType === 'agency' ? 'Agency' : 'Property'}</span></td>
                      <td>{formatDate(a.submittedAt ?? a.createdAt)}</td>
                      <td>
                        <span data-status-badge data-status={a.status}>{a.status.replace(/_/g, ' ')}</span>
                        {a.flaggedForManualReview ? <span data-status-badge data-status="flagged" style={{ marginLeft: 6 }}><Icons.Flag size={10} /> Flagged</span> : null}
                      </td>
                      <td><Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} applications</span>
                <button data-pagination-prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                <span data-pagination-current>{page} / {data.meta.totalPages}</span>
                <button data-pagination-next disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            ) : null}
          </div>
        )}
      </Panel>
    </div>
  );
}

type ModalKind = 'approve' | 'reject' | 'request-docs' | 'flag' | null;

function ApplicationDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = React.useState<ModalKind>(null);

  const { data: app, isLoading } = useQuery({ queryKey: vettingKeys.application(id), queryFn: () => api.vetting.getAdminDetail(id) });
  const { data: documents } = useQuery({ queryKey: vettingKeys.documents(id), queryFn: () => api.vetting.getDocuments(id) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: vettingKeys.application(id) });
    queryClient.invalidateQueries({ queryKey: vettingKeys.pending({}) });
    queryClient.invalidateQueries({ queryKey: vettingKeys.applications({}) });
  };

  const startReviewMutation = useMutation({
    mutationFn: () => api.vetting.startReview(id),
    onSuccess: () => { toast('Review started.', 'success'); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not start review', 'error'),
  });

  const approveForm = useForm<ApproveApplicationInput>({ resolver: zodResolver(approveApplicationSchema) });
  const approveMutation = useMutation({
    mutationFn: (input: ApproveApplicationInput) => api.vetting.approve(id, input.notes),
    onSuccess: () => { toast('Application approved — the account is now live.', 'success'); setModal(null); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not approve application', 'error'),
  });

  const rejectForm = useForm<RejectApplicationInput>({ resolver: zodResolver(rejectApplicationSchema) });
  const rejectMutation = useMutation({
    mutationFn: (input: RejectApplicationInput) => api.vetting.reject(id, input.reason),
    onSuccess: () => { toast('Application rejected.', 'success'); setModal(null); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not reject application', 'error'),
  });

  const requestDocsForm = useForm<RequestDocsInput>({ resolver: zodResolver(requestDocsSchema) });
  const requestDocsMutation = useMutation({
    mutationFn: (input: RequestDocsInput) => api.vetting.requestDocs(id, input.notes, input.docTypes),
    onSuccess: () => { toast('Documents requested from applicant.', 'success'); setModal(null); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not request documents', 'error'),
  });

  const flagForm = useForm<FlagApplicationInput>({ resolver: zodResolver(flagApplicationSchema) });
  const flagMutation = useMutation({
    mutationFn: (input: FlagApplicationInput) => api.vetting.flag(id, input.reason),
    onSuccess: () => { toast('Application flagged.', 'success'); setModal(null); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not flag application', 'error'),
  });

  const unflagMutation = useMutation({
    mutationFn: () => api.vetting.unflag(id),
    onSuccess: () => { toast('Flag removed.', 'success'); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not remove flag', 'error'),
  });

  const reviewDocMutation = useMutation({
    mutationFn: ({ docId, status }: { docId: string; status: 'approved' | 'rejected' }) => api.vetting.reviewDocument(id, docId, status),
    onSuccess: () => {
      toast('Document reviewed.', 'success');
      queryClient.invalidateQueries({ queryKey: vettingKeys.documents(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not review document', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={5} />;
  if (!app) return <EmptyBlock icon={Icons.ClipboardList} title="Application not found" />;

  const canAct = !['approved', 'rejected', 'withdrawn'].includes(app.status);
  const title = app.applicantType === 'agency' ? app.businessName || app.applicantName : app.propertyName || app.applicantName;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/vetting'); }}>Vetting</a>
        <Icons.ChevronRight /> <span>{title}</span>
      </div>

      <div data-detail-header>
        <div data-detail-heading>
          <div>
            <h1 data-page-title style={{ fontSize: 24 }}>{title}</h1>
            <div data-detail-meta-row>
              <span data-status-badge data-status={app.status}>{app.status.replace(/_/g, ' ')}</span>
              <span data-status-badge data-status={app.applicantType === 'agency' ? 'agency' : 'property'}>{app.applicantType === 'agency' ? 'Agency' : 'Property'}</span>
              {app.flaggedForManualReview ? <span data-status-badge data-status="flagged"><Icons.Flag size={10} /> Flagged</span> : null}
            </div>
          </div>
        </div>
        {canAct ? (
          <div data-page-header-actions>
            {app.status === 'documents_submitted' ? (
              <button data-btn-secondary onClick={() => startReviewMutation.mutate()} disabled={startReviewMutation.isPending}>
                <Icons.Eye /> Start Review
              </button>
            ) : null}
            <button data-btn-secondary onClick={() => setModal('request-docs')}>
              <Icons.FileText /> Request Docs
            </button>
            {app.flaggedForManualReview ? (
              <button data-btn-secondary onClick={() => unflagMutation.mutate()} disabled={unflagMutation.isPending}>
                <Icons.Flag /> Remove Flag
              </button>
            ) : (
              <button data-btn-secondary onClick={() => setModal('flag')}>
                <Icons.Flag /> Flag
              </button>
            )}
            <button data-btn-danger onClick={() => setModal('reject')}>
              <Icons.X /> Reject
            </button>
            <button data-btn-primary onClick={() => setModal('approve')}>
              <Icons.Check /> Approve
            </button>
          </div>
        ) : null}
      </div>

      <div data-grid-2col>
        <Panel title="Applicant">
          <div data-kv-grid>
            <div data-readonly-field><span data-readonly-label>Name</span><span data-readonly-value>{app.applicantName}</span></div>
            <div data-readonly-field><span data-readonly-label>Email</span><span data-readonly-value>{app.applicantEmail}</span></div>
            <div data-readonly-field><span data-readonly-label>Phone</span><span data-readonly-value>{app.applicantPhone ?? '—'}</span></div>
            <div data-readonly-field><span data-readonly-label>Submitted</span><span data-readonly-value>{app.submittedAt ? formatDateTime(app.submittedAt) : 'Not yet submitted'}</span></div>
          </div>
        </Panel>
        <Panel title={app.applicantType === 'agency' ? 'Agency details' : 'Property details'}>
          {app.applicantType === 'agency' ? (
            <div data-kv-grid>
              <div data-readonly-field><span data-readonly-label>Business name</span><span data-readonly-value>{app.businessName ?? '—'}</span></div>
              <div data-readonly-field><span data-readonly-label>Registration No.</span><span data-readonly-value>{app.registrationNumber ?? '—'}</span></div>
            </div>
          ) : (
            <div data-kv-grid>
              <div data-readonly-field><span data-readonly-label>Property name</span><span data-readonly-value>{app.propertyName ?? '—'}</span></div>
              <div data-readonly-field><span data-readonly-label>Type</span><span data-readonly-value>{app.propertyType ? titleCase(app.propertyType) : '—'}</span></div>
              <div data-readonly-field><span data-readonly-label>City</span><span data-readonly-value>{app.propertyCity ?? '—'}</span></div>
              <div data-readonly-field><span data-readonly-label>Province</span><span data-readonly-value>{app.propertyProvince ?? '—'}</span></div>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Documents">
        {app.documentsRequired.length === 0 ? (
          <EmptyBlock icon={Icons.FileText} title="No documents required for this application" />
        ) : (
          <div>
            {app.documentsRequired.map((doc) => {
              const uploaded = (documents ?? []).find((d) => d.docType === doc.docType);
              return (
                <div key={doc.docType} data-doc-row>
                  <div data-doc-icon>
                    {doc.submitted ? <Icons.FileCheck2 size={16} style={{ color: 'var(--color-success)' }} /> : <Icons.FileX2 size={16} style={{ color: 'var(--color-text-muted)' }} />}
                  </div>
                  <div data-doc-body>
                    <div data-doc-name>{doc.label}{doc.required ? '' : ' (optional)'}</div>
                    <div data-doc-meta>
                      {doc.submitted ? `Submitted ${doc.submittedAt ? formatDate(doc.submittedAt) : ''}` : 'Not yet submitted'}
                      {uploaded ? ` — ${uploaded.reviewStatus}` : ''}
                    </div>
                  </div>
                  {uploaded && uploaded.reviewStatus === 'pending' ? (
                    <div data-doc-actions>
                      <button data-btn-secondary data-btn-sm onClick={() => reviewDocMutation.mutate({ docId: uploaded._id, status: 'approved' })}>
                        Approve
                      </button>
                      <button data-btn-danger data-btn-sm onClick={() => reviewDocMutation.mutate({ docId: uploaded._id, status: 'rejected' })}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {app.rejectionReason || app.approvalNotes || app.resubmissionNotes || app.flagReason ? (
        <Panel title="Notes">
          <div data-timeline>
            {app.approvalNotes ? (
              <div data-timeline-item><span data-timeline-dot /><div data-timeline-body><div data-timeline-title>Approval notes</div><div data-timeline-note>{app.approvalNotes}</div></div></div>
            ) : null}
            {app.rejectionReason ? (
              <div data-timeline-item><span data-timeline-dot /><div data-timeline-body><div data-timeline-title>Rejection reason</div><div data-timeline-note>{app.rejectionReason}</div></div></div>
            ) : null}
            {app.resubmissionNotes ? (
              <div data-timeline-item><span data-timeline-dot /><div data-timeline-body><div data-timeline-title>Documents requested ({app.resubmissionCount})</div><div data-timeline-note>{app.resubmissionNotes}</div></div></div>
            ) : null}
            {app.flagReason ? (
              <div data-timeline-item><span data-timeline-dot /><div data-timeline-body><div data-timeline-title>Flag reason</div><div data-timeline-note>{app.flagReason}</div></div></div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="Approve this application">
        <form onSubmit={approveForm.handleSubmit((v) => approveMutation.mutate(v))}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            This creates the {app.applicantType === 'agency' ? 'agency' : 'property'} account and makes it operational immediately.
          </p>
          <div data-form-group>
            <label>Notes (optional)</label>
            <textarea rows={3} {...approveForm.register('notes')} />
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
            <button type="button" data-btn-secondary onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={approveMutation.isPending}>{approveMutation.isPending ? 'Approving…' : 'Approve'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject this application">
        <form onSubmit={rejectForm.handleSubmit((v) => rejectMutation.mutate(v))}>
          <div data-form-group>
            <label>Reason</label>
            <textarea rows={3} {...rejectForm.register('reason')} />
            {rejectForm.formState.errors.reason ? <InlineError message={rejectForm.formState.errors.reason.message} /> : null}
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
            <button type="button" data-btn-secondary onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" data-btn-danger disabled={rejectMutation.isPending}>{rejectMutation.isPending ? 'Rejecting…' : 'Reject'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'request-docs'} onClose={() => setModal(null)} title="Request more documents">
        <form onSubmit={requestDocsForm.handleSubmit((v) => requestDocsMutation.mutate(v))}>
          <div data-form-group>
            <label>Message to applicant</label>
            <textarea rows={3} {...requestDocsForm.register('notes')} />
            {requestDocsForm.formState.errors.notes ? <InlineError message={requestDocsForm.formState.errors.notes.message} /> : null}
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
            <button type="button" data-btn-secondary onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={requestDocsMutation.isPending}>{requestDocsMutation.isPending ? 'Sending…' : 'Request Documents'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'flag'} onClose={() => setModal(null)} title="Flag for manual review">
        <form onSubmit={flagForm.handleSubmit((v) => flagMutation.mutate(v))}>
          <div data-form-group>
            <label>Reason</label>
            <textarea rows={3} {...flagForm.register('reason')} />
            {flagForm.formState.errors.reason ? <InlineError message={flagForm.formState.errors.reason.message} /> : null}
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
            <button type="button" data-btn-secondary onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={flagMutation.isPending}>{flagMutation.isPending ? 'Flagging…' : 'Flag'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
