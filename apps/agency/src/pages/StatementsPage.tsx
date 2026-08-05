import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PageHeader, StatCard, Panel, LoadingBlock, EmptyBlock, DownloadButton, Icons } from '@stayos/ui';
import { statementKeys } from '../lib/query-keys';
import { formatZAR, formatDate, formatNumber } from '../lib/format';

export default function StatementsPage(): React.ReactElement {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('all');
  const { data, isLoading } = useQuery({
    queryKey: statementKeys.list({ page, limit: 20, status: status === 'all' ? undefined : status }),
    queryFn: () => api.agency.listStatements({ page, limit: 20, status: status === 'all' ? undefined : status }),
  });

  const currentYear = String(new Date().getFullYear());
  const ytdTotal = (data?.data ?? [])
    .filter((s) => s.period.startsWith(currentYear))
    .reduce((sum, s) => sum + s.managementFeeAmount, 0);
  const draftCount = (data?.data ?? []).filter((s) => s.status === 'draft').length;

  return (
    <div>
      <PageHeader title="Statements" subtitle="Management-fee records across your managed properties." />

      <div data-stat-grid>
        <StatCard icon={Icons.Receipt} tone="green" label="This Page — Fees Earned" value={formatZAR(ytdTotal)} sublabel="Sum of management fees shown below" />
        <StatCard icon={Icons.Clock} tone="amber" label="Awaiting Finalisation" value={formatNumber(draftCount)} sublabel="Draft statements" />
      </div>

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="finalised">Finalised</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Receipt} title="No statements yet" description="Statements appear here once a managed property's first billing period closes." />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Period</th>
                    <th>Gross Revenue</th>
                    <th>Fee</th>
                    <th>Net to Owner</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((s) => (
                    <tr key={s._id}>
                      <td><div data-cell-entity-name>{typeof s.tenantId === 'object' ? s.tenantId.name : 'Property'}</div></td>
                      <td>{s.period}{s.isPartialMonth ? ' (partial)' : ''}</td>
                      <td data-tabular-nums>{formatZAR(s.grossRevenue)}</td>
                      <td data-tabular-nums>
                        {formatZAR(s.managementFeeAmount)}
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 11.5 }}>
                          {' '}({s.managementFeeType === 'percentage' ? `${s.managementFeeValue}%` : 'fixed'})
                        </span>
                      </td>
                      <td data-tabular-nums>{formatZAR(s.netOwnerAmount)}</td>
                      <td><span data-status-badge data-status={s.status}>{s.status}</span></td>
                      <td>
                        {s.statementPdfUrl ? (
                          <DownloadButton href={api.agency.getStatementPdfUrl(s._id)} filename={`statement-${s.period}.pdf`} label="PDF" />
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} statements</span>
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
