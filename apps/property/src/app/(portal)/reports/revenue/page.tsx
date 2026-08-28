'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { RoleGate, SkeletonLoader, ReadOnlyField, EmptyState, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';

interface GroupTotal {
  _id: string | { year: number; month: number; day?: number };
  total: number;
  count: number;
}

interface RevenueReport {
  total: number;
  count: number;
  byPeriod: GroupTotal[];
  byType: GroupTotal[];
  byGateway: GroupTotal[];
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function fmtPeriod(id: GroupTotal['_id']): string {
  if (typeof id === 'string') return id;
  return id.day ? `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}` : `${id.year}-${String(id.month).padStart(2, '0')}`;
}

function RevenueReportInner(): React.ReactElement {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');

  const params = Object.fromEntries(Object.entries({ from, to, groupBy }).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => api.reports.getRevenue(params) as unknown as Promise<RevenueReport>,
  });

  return (
    <div data-page="report-revenue">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Revenue</h1>
        </div>
      </div>

      <div data-filter-bar>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-filter-input placeholder="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-filter-input placeholder="To" />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')} data-filter-select>
          <option value="day">Daily</option>
          <option value="month">Monthly</option>
        </select>
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Total revenue" value={fmtCurrency(data.total)} />
            <ReadOnlyField label="Payments" value={data.count} />
          </div>

          <section data-report-section>
            <h2>By period</h2>
            <table data-table>
              <thead><tr><th>Period</th><th>Total</th><th>Count</th></tr></thead>
              <tbody>
                {data.byPeriod.map((row, i) => (
                  <tr key={i}>
                    <td>{fmtPeriod(row._id)}</td>
                    <td>{fmtCurrency(row.total)}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section data-report-section>
            <h2>By payment type</h2>
            <table data-table>
              <thead><tr><th>Type</th><th>Total</th><th>Count</th></tr></thead>
              <tbody>
                {data.byType.map((row, i) => (
                  <tr key={i}>
                    <td>{String(row._id)}</td>
                    <td>{fmtCurrency(row.total)}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section data-report-section>
            <h2>By gateway</h2>
            <table data-table>
              <thead><tr><th>Gateway</th><th>Total</th><th>Count</th></tr></thead>
              <tbody>
                {data.byGateway.map((row, i) => (
                  <tr key={i}>
                    <td>{String(row._id)}</td>
                    <td>{fmtCurrency(row.total)}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

export default function RevenueReportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.REPORT_REVENUE_READ}
      fallback={
        <EmptyState title="Not available" description="You don't have permission to view the revenue report." />
      }
    >
      <RevenueReportInner />
    </RoleGate>
  );
}
