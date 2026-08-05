import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatDateTime, titleCase } from '../lib/format';

export default function AuditLogsPage(): React.ReactElement {
  const [page, setPage] = React.useState(1);
  const [action, setAction] = React.useState('');
  const [resourceType, setResourceType] = React.useState('all');

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.auditLogs({ page, action, resourceType }),
    queryFn: () => api.platform.getAuditLogs({
      page, limit: 25,
      action: action || undefined,
      resourceType: resourceType === 'all' ? undefined : resourceType,
    }),
  });

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every recorded platform action, in order." />

      <div data-filter-bar>
        <label data-filter-search>
          <Icons.Search />
          <input placeholder="Filter by action (e.g. tenant.status_change)..." value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        </label>
        <label data-filter-select>
          <span>Resource</span>
          <select value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="Tenant">Tenant</option>
            <option value="AgencyTenant">Agency</option>
            <option value="SubscriptionPlan">Plan</option>
            <option value="SubscriptionCoupon">Coupon</option>
            <option value="PlatformUser">Platform user</option>
            <option value="OnboardingApplication">Application</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.ScrollText} title="No audit entries match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Action</th><th>Resource</th><th>Actor</th><th>When</th></tr></thead>
                <tbody>
                  {data.data.map((log) => (
                    <tr key={log._id}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{log.action}</span></td>
                      <td>{log.resourceType}{log.resourceId ? <span data-cell-entity-sub> {log.resourceId.slice(-8)}</span> : null}</td>
                      <td>{log.actorRole ? titleCase(log.actorRole) : log.actorModel ?? 'System'}</td>
                      <td>{formatDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} entries</span>
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
