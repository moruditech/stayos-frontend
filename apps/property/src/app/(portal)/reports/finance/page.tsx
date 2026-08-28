'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { RoleGate, SkeletonLoader, ReadOnlyField, EmptyState, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';

interface GroupTotal {
  _id: string;
  total: number;
}

interface FinanceReport {
  grossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  byType: GroupTotal[];
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function FinanceSummary(): React.ReactElement {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'finance', params],
    queryFn: () => api.reports.getFinance(params) as unknown as Promise<FinanceReport>,
  });

  return (
    <>
      <div data-filter-bar>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-filter-input placeholder="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-filter-input placeholder="To" />
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Gross revenue" value={fmtCurrency(data.grossRevenue)} />
            <ReadOnlyField label="Refunds" value={fmtCurrency(data.totalRefunds)} />
            <ReadOnlyField label="Net revenue" value={fmtCurrency(data.netRevenue)} />
          </div>

          <section data-report-section>
            <h2>By payment type</h2>
            <table data-table>
              <thead><tr><th>Type</th><th>Total</th></tr></thead>
              <tbody>
                {data.byType.map((row, i) => (
                  <tr key={i}>
                    <td>{row._id}</td>
                    <td>{fmtCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}

function NightAudit(): React.ReactElement {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'night-audit', date],
    queryFn: () => api.reports.getNightAudit(date),
    retry: false,
  });

  const apiError = error as ApiError | undefined;

  return (
    <>
      <div data-filter-bar>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-filter-input />
      </div>

      {isLoading ? (
        <SkeletonLoader rows={4} />
      ) : apiError ? (
        <EmptyState
          title="No night audit record"
          description={apiError.message ?? `No night audit found for ${date}.`}
        />
      ) : (
        <pre data-json-preview>{JSON.stringify(data, null, 2)}</pre>
      )}
    </>
  );
}

function FinanceReportInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') === 'night-audit' ? 'night-audit' : 'summary';

  return (
    <div data-page="report-finance">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>{view === 'night-audit' ? 'Night audit' : 'Finance'}</h1>
        </div>
        <div data-tab-bar role="tablist">
          <Link href="/reports/finance" data-tab data-active={view === 'summary' || undefined}>Summary</Link>
          <Link href="/reports/finance?view=night-audit" data-tab data-active={view === 'night-audit' || undefined}>Night audit</Link>
        </div>
      </div>

      {view === 'night-audit' ? <NightAudit /> : <FinanceSummary />}
    </div>
  );
}

export default function FinanceReportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.REPORT_FINANCE_READ}
      fallback={<EmptyState title="Not available" description="You don't have permission to view finance reports." />}
    >
      <Suspense fallback={<></>}>
        <FinanceReportInner />
      </Suspense>
    </RoleGate>
  );
}
