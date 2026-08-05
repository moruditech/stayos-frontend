import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { AGENCY_STATUS } from '@stayos/constants';
import { changeAgencyStatusSchema } from '@stayos/validators';
import type { ChangeAgencyStatusInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, useToast, Modal, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatDate, formatNumber, titleCase } from '../lib/format';

export default function AgenciesPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  if (id) return <AgencyDetailView id={id} />;
  return <AgencyListView />;
}

function AgencyListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.agencies({ page, search, status }),
    queryFn: () => api.platform.listAgencies({ page, limit: 20, search: search || undefined, status: status === 'all' ? undefined : status }),
  });

  return (
    <div>
      <PageHeader title="Agencies" subtitle="Every agency operating on the platform." />
      <div data-filter-bar>
        <label data-filter-search>
          <Icons.Search />
          <input placeholder="Search agencies..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </label>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            {Object.values(AGENCY_STATUS).map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </select>
        </label>
      </div>
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Agency} title="No agencies match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Agency</th><th>Type</th><th>Managed properties</th><th>Status</th><th>Approved</th></tr></thead>
                <tbody>
                  {data.data.map((a) => (
                    <tr key={a._id} data-clickable onClick={() => navigate(`/agencies/${a._id}`)}>
                      <td>
                        <div data-cell-entity-name>{a.name}</div>
                        <div data-cell-entity-sub>{a.contactEmail}</div>
                      </td>
                      <td>{titleCase(a.type)}</td>
                      <td data-tabular-nums>{a.managedProperties.length}</td>
                      <td><span data-status-badge data-status={a.status}>{a.status}</span></td>
                      <td>{a.approvedAt ? formatDate(a.approvedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{formatNumber(data.meta.total)} agencies</span>
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

function AgencyDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  const { data: agency, isLoading } = useQuery({ queryKey: platformKeys.agency(id), queryFn: () => api.platform.getAgency(id) });
  const form = useForm<ChangeAgencyStatusInput>({ resolver: zodResolver(changeAgencyStatusSchema) });

  const mutation = useMutation({
    mutationFn: (input: ChangeAgencyStatusInput) => api.platform.updateAgencyStatus(id, input.status),
    onSuccess: () => {
      toast('Agency status updated.', 'success');
      setStatusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: platformKeys.agency(id) });
      queryClient.invalidateQueries({ queryKey: platformKeys.agencies({}) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update status', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={5} />;
  if (!agency) return <EmptyBlock icon={Icons.Agency} title="Agency not found" />;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/agencies'); }}>Agencies</a>
        <Icons.ChevronRight /> <span>{agency.name}</span>
      </div>
      <PageHeader
        title={agency.name}
        subtitle={agency.contactEmail}
        actions={
          <button data-btn-primary onClick={() => setStatusModalOpen(true)}>
            <Icons.RefreshCcw /> Change Status
          </button>
        }
      />

      <div data-grid-2col>
        <Panel title="Details">
          <div data-kv-grid>
            <div data-readonly-field><span data-readonly-label>Type</span><span data-readonly-value>{titleCase(agency.type)}</span></div>
            <div data-readonly-field><span data-readonly-label>Status</span><span data-status-badge data-status={agency.status}>{agency.status}</span></div>
            <div data-readonly-field><span data-readonly-label>Registration No.</span><span data-readonly-value>{agency.registrationNumber ?? '—'}</span></div>
            <div data-readonly-field><span data-readonly-label>Tax No.</span><span data-readonly-value>{agency.taxNumber ?? '—'}</span></div>
            <div data-readonly-field><span data-readonly-label>Contact</span><span data-readonly-value>{agency.contactName}, {agency.contactPhone ?? 'no phone on file'}</span></div>
            <div data-readonly-field><span data-readonly-label>Approved</span><span data-readonly-value>{agency.approvedAt ? formatDate(agency.approvedAt) : 'Not yet'}</span></div>
          </div>
        </Panel>
        <Panel title="Managed properties" description={`${agency.managedProperties.length} total`}>
          {agency.managedProperties.length === 0 ? (
            <EmptyBlock icon={Icons.Building2} title="No properties under management" />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              View individual properties from the Tenants list.
            </p>
          )}
        </Panel>
      </div>

      <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change agency status">
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div data-form-group>
            <label>New status</label>
            <select {...form.register('status')}>
              <option value="">Select a status</option>
              {Object.values(AGENCY_STATUS).filter((s) => s !== agency.status).map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </select>
            {form.formState.errors.status ? <InlineError message={form.formState.errors.status.message} /> : null}
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" data-btn-secondary onClick={() => setStatusModalOpen(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
