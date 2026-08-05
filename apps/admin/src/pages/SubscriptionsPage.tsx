import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PERMISSIONS } from '@stayos/constants';
import { refundSubscriptionSchema } from '@stayos/validators';
import type { RefundSubscriptionInput } from '@stayos/validators';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, InlineError, useToast, Modal, RoleGate, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatZAR, formatDate, titleCase } from '../lib/format';

export default function SubscriptionsPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  if (id) return <SubscriptionDetailView id={id} />;
  return <SubscriptionListView />;
}

function SubscriptionListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('all');

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.subscriptions({ page, status }),
    queryFn: () => api.platform.listSubscriptions({ page, limit: 20, status: status === 'all' ? undefined : status }),
  });

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Every tenant subscription on the platform." />
      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="trialing">Trialing</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.CreditCard} title="No subscriptions match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Tenant</th><th>Plan</th><th>Cycle</th><th>Next billing</th><th>Status</th></tr></thead>
                <tbody>
                  {data.data.map((s) => (
                    <tr key={s._id} data-clickable onClick={() => navigate(`/subscriptions/${s._id}`)}>
                      <td><div data-cell-entity-name>{s.tenantId?.name ?? 'Unknown tenant'}</div></td>
                      <td>{s.planId ? <span data-plan-badge>{s.planId.tier}</span> : '—'}</td>
                      <td>{s.billingCycle ? titleCase(s.billingCycle) : '—'}</td>
                      <td>{s.nextBillingDate ? formatDate(s.nextBillingDate) : '—'}</td>
                      <td><span data-status-badge data-status={s.status}>{s.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} subscriptions</span>
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

function SubscriptionDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [refundOpen, setRefundOpen] = React.useState(false);

  const { data: sub, isLoading } = useQuery({ queryKey: platformKeys.subscription(id), queryFn: () => api.platform.getSubscription(id) });

  const form = useForm<RefundSubscriptionInput>({ resolver: zodResolver(refundSubscriptionSchema) });

  const refundMutation = useMutation({
    mutationFn: (input: RefundSubscriptionInput) => api.platform.refundSubscription(id, input.amount, input.reason),
    onSuccess: () => {
      toast('Refund issued.', 'success');
      setRefundOpen(false);
      queryClient.invalidateQueries({ queryKey: platformKeys.subscription(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not issue refund', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={4} />;
  if (!sub) return <EmptyBlock icon={Icons.CreditCard} title="Subscription not found" />;

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/subscriptions'); }}>Subscriptions</a>
        <Icons.ChevronRight /> <span>{sub.tenantId?.name ?? 'Subscription'}</span>
      </div>
      <PageHeader
        title={sub.tenantId?.name ?? 'Subscription'}
        subtitle={sub.planId?.name}
        actions={
          // Refund is '*'-only on the backend (Document 14 §4) — hidden
          // entirely for every other role, not shown-and-disabled.
          <RoleGate perm={[PERMISSIONS.WILDCARD]}>
            <button data-btn-danger onClick={() => setRefundOpen(true)}>
              <Icons.Banknote /> Issue Refund
            </button>
          </RoleGate>
        }
      />

      <div data-grid-2col>
        <Panel title="Subscription">
          <div data-kv-grid>
            <div data-readonly-field><span data-readonly-label>Status</span><span data-status-badge data-status={sub.status}>{sub.status.replace('_', ' ')}</span></div>
            <div data-readonly-field><span data-readonly-label>Billing cycle</span><span data-readonly-value>{sub.billingCycle ? titleCase(sub.billingCycle) : '—'}</span></div>
            <div data-readonly-field><span data-readonly-label>Current period</span><span data-readonly-value>{sub.currentPeriodStart ? `${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}` : '—'}</span></div>
            <div data-readonly-field><span data-readonly-label>Next billing</span><span data-readonly-value>{sub.nextBillingDate ? formatDate(sub.nextBillingDate) : '—'}</span></div>
          </div>
        </Panel>
        <Panel title="Plan">
          {sub.planId ? (
            <div data-kv-grid>
              <div data-readonly-field><span data-readonly-label>Plan</span><span data-readonly-value>{sub.planId.name}</span></div>
              <div data-readonly-field><span data-readonly-label>Tier</span><span data-plan-badge>{sub.planId.tier}</span></div>
              <div data-readonly-field><span data-readonly-label>Monthly price</span><span data-readonly-value>{formatZAR(sub.planId.monthlyPrice)}</span></div>
            </div>
          ) : (
            <EmptyBlock icon={Icons.Tag} title="No plan on this subscription" />
          )}
        </Panel>
      </div>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Issue a refund">
        <form onSubmit={form.handleSubmit((values) => refundMutation.mutate(values))}>
          <div data-form-group>
            <label>Amount (ZAR)</label>
            <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} />
            {form.formState.errors.amount ? <InlineError message={form.formState.errors.amount.message} /> : null}
          </div>
          <div data-form-group>
            <label>Reason</label>
            <textarea rows={3} {...form.register('reason')} />
            {form.formState.errors.reason ? <InlineError message={form.formState.errors.reason.message} /> : null}
            <span data-field-hint>Recorded on the audit log.</span>
          </div>
          <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" data-btn-secondary onClick={() => setRefundOpen(false)}>Cancel</button>
            <button type="submit" data-btn-danger disabled={refundMutation.isPending}>
              {refundMutation.isPending ? 'Processing…' : 'Issue Refund'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
