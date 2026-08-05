import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError, AgencyMandate } from '@stayos/api-client';
import { requestExistingMandateSchema, terminateMandateSchema } from '@stayos/validators';
import type { RequestExistingMandateInput, TerminateMandateInput } from '@stayos/validators';
import {
  PageHeader,
  Panel,
  LoadingBlock,
  EmptyBlock,
  InlineError,
  applyServerErrors,
  useToast,
  ConfirmDialog,
  Icons,
} from '@stayos/ui';
import { mandateKeys } from '../lib/query-keys';
import { formatZAR, formatDate, formatDateTime } from '../lib/format';

export default function MandatesPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  if (location.pathname === '/mandates/new') return <NewMandateView />;
  if (id) return <MandateDetailView id={id} />;
  return <MandateListView />;
}

// ── List ─────────────────────────────────────────────────────────────────

function MandateListView(): React.ReactElement {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState('all');
  const { data, isLoading } = useQuery({
    queryKey: mandateKeys.list(),
    queryFn: () => api.agency.listMandates(),
  });

  const filtered = (data ?? []).filter((m) => status === 'all' || m.mandateStatus === status);

  return (
    <div>
      <PageHeader
        title="Mandates"
        subtitle="Every management mandate your agency holds, requested, or has terminated."
        actions={
          <button data-btn-primary onClick={() => navigate('/mandates/new')}>
            <Icons.Plus /> Request Mandate
          </button>
        }
      />

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="termination_notice">Termination notice</option>
            <option value="terminated">Terminated</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <EmptyBlock
            icon={Icons.FileText}
            title="No mandates yet"
            description="Request management of an existing property, or onboard a brand-new one."
            action={
              <button data-btn-primary onClick={() => navigate('/mandates/new')}>
                Request Mandate
              </button>
            }
          />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Fee</th>
                    <th>Notice period</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m._id} data-clickable onClick={() => navigate(`/mandates/${m._id}`)}>
                      <td>
                        <div data-cell-entity-name>{m.propertyId?.name ?? 'Property'}</div>
                      </td>
                      <td>
                        {m.managementFeeType === 'percentage' ? `${m.managementFeeValue}%` : formatZAR(m.managementFeeValue)}
                      </td>
                      <td>{m.terminationNoticeDays ?? 30} days</td>
                      <td><span data-status-badge data-status={m.mandateStatus}>{m.mandateStatus.replace('_', ' ')}</span></td>
                      <td>{formatDate(m.createdAt)}</td>
                      <td><Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── New (Path B — request management of an EXISTING property) ─────────────
// Document 13 §4: this is deliberately the property-search form only.
// Onboarding a brand-new property is a wholly separate flow, /properties/onboard.

function NewMandateView(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [propertyQuery, setPropertyQuery] = React.useState('');
  const [propertyResults, setPropertyResults] = React.useState<{ _id: string; name: string; city?: string | undefined }[]>([]);
  const [selectedProperty, setSelectedProperty] = React.useState<{ _id: string; name: string } | null>(null);
  const [searching, setSearching] = React.useState(false);

  const form = useForm<RequestExistingMandateInput>({
    resolver: zodResolver(requestExistingMandateSchema),
    defaultValues: { feeType: 'percentage', feeValue: 10, noticeDays: 30, ownerEmail: '', existingPropertyId: '' },
  });

  React.useEffect(() => {
    if (propertyQuery.trim().length < 2) {
      setPropertyResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const results = await api.discovery.searchProperties({ search: propertyQuery, limit: 6 });
        setPropertyResults(
          (results as Array<Record<string, unknown>>).map((r) => ({
            _id: String(r['_id']),
            name: String(r['name'] ?? ''),
            city: (r['address'] as { city?: string } | undefined)?.city,
          }))
        );
      } catch {
        setPropertyResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [propertyQuery]);

  const mutation = useMutation({
    mutationFn: (input: RequestExistingMandateInput) =>
      api.agency.createMandate({
        ownerEmail: input.ownerEmail,
        feeType: input.feeType,
        feeValue: input.feeValue,
        noticeDays: input.noticeDays,
        propertyDetails: { existingPropertyId: input.existingPropertyId },
      }),
    onSuccess: () => {
      toast('Mandate request sent to the property owner.', 'success');
      queryClient.invalidateQueries({ queryKey: mandateKeys.list() });
      navigate('/mandates');
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR') applyServerErrors(form, apiErr);
      else toast(apiErr.message ?? 'Could not send mandate request', 'error');
    },
  });

  return (
    <div>
      <PageHeader title="Request Property Mandate" subtitle="Ask an existing StayOS property owner for management rights." />
      <div style={{ maxWidth: 560 }}>
        <Panel>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div data-form-group>
              <label>Property</label>
              {selectedProperty ? (
                <div data-radio-card data-selected="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{selectedProperty.name}</span>
                  <button
                    type="button"
                    data-btn-ghost
                    data-btn-sm
                    onClick={() => {
                      setSelectedProperty(null);
                      form.setValue('existingPropertyId', '');
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    placeholder="Search by property name..."
                    value={propertyQuery}
                    onChange={(e) => setPropertyQuery(e.target.value)}
                  />
                  {searching ? <span data-field-hint>Searching…</span> : null}
                  {propertyResults.length > 0 ? (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: 6 }}>
                      {propertyResults.map((r) => (
                        <button
                          type="button"
                          key={r._id}
                          data-dropdown-item
                          style={{ width: '100%' }}
                          onClick={() => {
                            setSelectedProperty(r);
                            form.setValue('existingPropertyId', r._id, { shouldValidate: true });
                            setPropertyResults([]);
                            setPropertyQuery(r.name);
                          }}
                        >
                          <Icons.Building2 size={14} /> {r.name}{r.city ? ` — ${r.city}` : ''}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
              {form.formState.errors.existingPropertyId ? (
                <InlineError message={form.formState.errors.existingPropertyId.message} />
              ) : null}
            </div>

            <div data-form-group>
              <label>Owner's email</label>
              <input type="email" placeholder="owner@example.com" {...form.register('ownerEmail')} />
              {form.formState.errors.ownerEmail ? <InlineError message={form.formState.errors.ownerEmail.message} /> : null}
              <span data-field-hint>We'll notify this address so the owner can review and sign.</span>
            </div>

            <div data-form-grid-2>
              <div data-form-group>
                <label>Fee type</label>
                <select {...form.register('feeType')}>
                  <option value="percentage">Percentage of revenue</option>
                  <option value="fixed">Fixed monthly fee</option>
                </select>
              </div>
              <div data-form-group>
                <label>Fee value</label>
                <input type="number" step="0.01" {...form.register('feeValue', { valueAsNumber: true })} />
                {form.formState.errors.feeValue ? <InlineError message={form.formState.errors.feeValue.message} /> : null}
              </div>
            </div>

            <div data-form-group>
              <label>Notice period (days)</label>
              <input type="number" {...form.register('noticeDays', { valueAsNumber: true })} />
              {form.formState.errors.noticeDays ? <InlineError message={form.formState.errors.noticeDays.message} /> : null}
              <span data-field-hint>How much notice either party must give to terminate this mandate.</span>
            </div>

            <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/mandates')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending…' : 'Send Mandate Request'}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────

function MandateDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [terminateOpen, setTerminateOpen] = React.useState(false);

  const { data: mandate, isLoading } = useQuery({
    queryKey: mandateKeys.detail(id),
    queryFn: () => api.agency.getMandate(id),
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.agency.acceptMandate(id),
    onSuccess: () => {
      toast('Mandate accepted.', 'success');
      queryClient.invalidateQueries({ queryKey: mandateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mandateKeys.list() });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not accept mandate', 'error'),
  });

  const terminateForm = useForm<TerminateMandateInput>({
    resolver: zodResolver(terminateMandateSchema),
    defaultValues: { reason: '' },
  });

  const terminateMutation = useMutation({
    mutationFn: (input: TerminateMandateInput) => {
      const propertyId = typeof mandate?.propertyId === 'object' ? mandate.propertyId._id : '';
      return api.agency.terminateMandate(propertyId, input.reason);
    },
    onSuccess: () => {
      toast('Termination notice sent.', 'success');
      setTerminateOpen(false);
      queryClient.invalidateQueries({ queryKey: mandateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mandateKeys.list() });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not terminate mandate', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={5} />;
  if (!mandate) return <EmptyBlock icon={Icons.FileX2} title="Mandate not found" />;

  const m = mandate as AgencyMandate;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/mandates'); }}>Mandates</a>
        <Icons.ChevronRight /> <span>{m.propertyId?.name}</span>
      </div>

      <div data-detail-header>
        <div data-detail-heading>
          <div data-detail-thumb style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Building2 style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div>
            <h1 data-page-title style={{ fontSize: 24 }}>{m.propertyId?.name ?? 'Property'}</h1>
            <div data-detail-meta-row>
              <span data-status-badge data-status={m.mandateStatus}>{m.mandateStatus.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        <div data-page-header-actions>
          {m.mandateStatus === 'pending' && !m.signedByAgencyAt ? (
            <button data-btn-primary onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
              <Icons.Check /> {acceptMutation.isPending ? 'Accepting…' : 'Accept Mandate'}
            </button>
          ) : null}
          {(m.mandateStatus === 'active' || m.mandateStatus === 'pending') ? (
            <button data-btn-danger onClick={() => setTerminateOpen(true)}>
              <Icons.X /> Terminate
            </button>
          ) : null}
        </div>
      </div>

      <div data-grid-2col>
        <Panel title="Mandate terms">
          <div data-kv-grid>
            <div data-readonly-field>
              <span data-readonly-label>Fee</span>
              <span data-readonly-value>
                {m.managementFeeType === 'percentage' ? `${m.managementFeeValue}% of revenue` : formatZAR(m.managementFeeValue ?? 0)}
              </span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Notice period</span>
              <span data-readonly-value>{m.terminationNoticeDays ?? 30} days</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Started</span>
              <span data-readonly-value>{m.startDate ? formatDate(m.startDate) : 'Not yet active'}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Requested</span>
              <span data-readonly-value>{formatDate(m.createdAt)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Signatures">
          <div data-timeline>
            <div data-timeline-item>
              <span data-timeline-dot style={{ background: m.signedByAgencyAt ? 'var(--color-success)' : 'var(--color-border-strong)' }} />
              <div data-timeline-body>
                <div data-timeline-title>Agency signature</div>
                <div data-timeline-meta>{m.signedByAgencyAt ? formatDateTime(m.signedByAgencyAt) : 'Awaiting'}</div>
              </div>
            </div>
            <div data-timeline-item>
              <span data-timeline-dot style={{ background: m.signedByOwnerAt ? 'var(--color-success)' : 'var(--color-border-strong)' }} />
              <div data-timeline-body>
                <div data-timeline-title>Owner signature</div>
                <div data-timeline-meta>{m.signedByOwnerAt ? formatDateTime(m.signedByOwnerAt) : 'Awaiting'}</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {m.mandateStatus === 'termination_notice' ? (
        <Panel title="Termination in progress">
          <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>
            Initiated by {m.terminationInitiatedBy ?? 'unknown'}. Notice period ends{' '}
            <strong>{formatDate(m.terminationDate)}</strong>.
          </p>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={terminateOpen}
        title="Terminate this mandate?"
        message="This starts the notice period. Both parties keep access until the notice period ends, then agency access to this property is revoked."
        confirmLabel={terminateMutation.isPending ? 'Sending…' : 'Start Termination'}
        destructive
        onCancel={() => setTerminateOpen(false)}
        onConfirm={() => terminateMutation.mutate(terminateForm.getValues())}
      />
    </div>
  );
}
