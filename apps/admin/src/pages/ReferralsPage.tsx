import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PERMISSIONS } from '@stayos/constants';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, useToast, ConfirmDialog, RoleGate, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatDate, formatZAR, titleCase } from '../lib/format';

export default function ReferralsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('all');
  const [rewardTarget, setRewardTarget] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.referrals({ page, status }),
    queryFn: () => api.platform.listReferrals({ page, limit: 20, status: status === 'all' ? undefined : status }),
  });

  const rewardMutation = useMutation({
    mutationFn: (id: string) => api.platform.rewardReferral(id),
    onSuccess: () => {
      toast('Referral marked as rewarded.', 'success');
      setRewardTarget(null);
      queryClient.invalidateQueries({ queryKey: platformKeys.referrals({}) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not reward referral', 'error'),
  });

  return (
    <div>
      <PageHeader title="Referrals" subtitle="Referral programme activity across tenants and agencies." />

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="signed_up">Signed up</option>
            <option value="first_payment_made">First payment made</option>
            <option value="rewarded">Rewarded</option>
            <option value="expired">Expired</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Gift} title="No referrals match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Referrer</th><th>Referred</th><th>Reward</th><th>Status</th><th>Date</th><th /></tr></thead>
                <tbody>
                  {data.data.map((r) => (
                    <tr key={r._id}>
                      <td><div data-cell-entity-name>{r.referrerTenantId?.name ?? 'Agency referral'}</div></td>
                      <td>{r.referredTenantId?.name ?? r.referredEmail ?? '—'}</td>
                      <td data-tabular-nums>{formatZAR(r.rewardAmount)}</td>
                      <td><span data-status-badge data-status={r.status}>{titleCase(r.status)}</span></td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>
                        {r.status === 'first_payment_made' ? (
                          // super_admin only (Document 14 §5) — hidden, not disabled, for every other role.
                          <RoleGate perm={[PERMISSIONS.WILDCARD]}>
                            <button data-btn-secondary data-btn-sm onClick={() => setRewardTarget(r._id)}>
                              Mark Rewarded
                            </button>
                          </RoleGate>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} referrals</span>
                <button data-pagination-prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                <span data-pagination-current>{page} / {data.meta.totalPages}</span>
                <button data-pagination-next disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            ) : null}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!rewardTarget}
        title="Mark this referral as rewarded?"
        message="This records the reward as paid out. Make sure the payout has actually happened first."
        confirmLabel={rewardMutation.isPending ? 'Saving…' : 'Mark Rewarded'}
        onCancel={() => setRewardTarget(null)}
        onConfirm={() => rewardTarget && rewardMutation.mutate(rewardTarget)}
      />
    </div>
  );
}
