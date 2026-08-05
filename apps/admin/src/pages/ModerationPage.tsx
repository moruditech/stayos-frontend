import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, useToast, Icons } from '@stayos/ui';
import { moderationKeys } from '../lib/query-keys';
import { formatDate } from '../lib/format';

export default function ModerationPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('pending');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: moderationKeys.reviews({ page, status }),
    queryFn: () => api.reviews.listForModeration({ page, limit: 20, status }),
    retry: false,
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'approved' | 'rejected' | 'flagged' }) => api.reviews.moderate(id, next),
    onSuccess: () => {
      toast('Review updated.', 'success');
      queryClient.invalidateQueries({ queryKey: moderationKeys.reviews({}) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update review', 'error'),
  });

  return (
    <div>
      <PageHeader title="Review Moderation" subtitle="Guest reviews awaiting approval or flagged for follow-up." />

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <EmptyBlock
            icon={Icons.AlertTriangle}
            title="Can't load reviews right now"
            description={
              (error as ApiError)?.status === 403
                ? "This account's session couldn't reach the review queue. If this keeps happening, it's worth flagging to engineering — the reviews list endpoint currently only accepts tenant-scoped sessions."
                : (error as ApiError)?.message ?? 'Something went wrong loading the moderation queue.'
            }
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Star} title="Nothing to moderate" description="Reviews needing attention will show up here." />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Property</th><th>Rating</th><th>Review</th><th>Submitted</th><th /></tr></thead>
                <tbody>
                  {data.data.map((r) => {
                    const row = r as Record<string, unknown>;
                    const id = String(row['_id']);
                    const tenant = row['tenantId'] as Record<string, unknown> | string | undefined;
                    return (
                      <tr key={id}>
                        <td><div data-cell-entity-name>{typeof tenant === 'object' ? String(tenant?.['name'] ?? '') : 'Property'}</div></td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Icons.Star key={i} size={13} style={{ color: i < Number(row['rating'] ?? 0) ? 'var(--color-warning)' : 'var(--color-border-strong)' }} />
                            ))}
                          </span>
                        </td>
                        <td style={{ maxWidth: 360 }}>{String(row['body'] ?? '').slice(0, 140)}</td>
                        <td>{formatDate(String(row['createdAt'] ?? ''))}</td>
                        <td>
                          <div data-cell-actions>
                            <button data-btn-secondary data-btn-sm onClick={() => moderateMutation.mutate({ id, next: 'approved' })}>
                              <Icons.Check /> Approve
                            </button>
                            <button data-btn-secondary data-btn-sm onClick={() => moderateMutation.mutate({ id, next: 'flagged' })}>
                              <Icons.Flag /> Flag
                            </button>
                            <button data-btn-danger data-btn-sm onClick={() => moderateMutation.mutate({ id, next: 'rejected' })}>
                              <Icons.X /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} reviews</span>
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
