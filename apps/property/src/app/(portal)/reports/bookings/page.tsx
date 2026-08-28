'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, ReadOnlyField, Icons } from '@stayos/ui';

interface GroupCount {
  _id: string;
  count: number;
  totalValue?: number;
}

interface BookingsReport {
  byStatus: GroupCount[];
  bySource: GroupCount[];
  totals: { count: number; totalValue: number; avgNights: number; avgValue: number };
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

export default function BookingsReportPage(): React.ReactElement {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'bookings', params],
    queryFn: () => api.reports.getBookings(params) as unknown as Promise<BookingsReport>,
  });

  return (
    <div data-page="report-bookings">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Bookings</h1>
        </div>
      </div>

      <div data-filter-bar>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-filter-input placeholder="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-filter-input placeholder="To" />
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Total bookings" value={data.totals.count} />
            <ReadOnlyField label="Total value" value={fmtCurrency(data.totals.totalValue)} />
            <ReadOnlyField label="Avg. nights" value={(data.totals.avgNights ?? 0).toFixed(1)} />
            <ReadOnlyField label="Avg. value" value={fmtCurrency(data.totals.avgValue)} />
          </div>

          <section data-report-section>
            <h2>By status</h2>
            <table data-table>
              <thead><tr><th>Status</th><th>Count</th><th>Total value</th></tr></thead>
              <tbody>
                {data.byStatus.map((row) => (
                  <tr key={row._id}>
                    <td>{row._id}</td>
                    <td>{row.count}</td>
                    <td>{fmtCurrency(row.totalValue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section data-report-section>
            <h2>By source</h2>
            <table data-table>
              <thead><tr><th>Source</th><th>Count</th></tr></thead>
              <tbody>
                {data.bySource.map((row) => (
                  <tr key={row._id}>
                    <td>{row._id}</td>
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
