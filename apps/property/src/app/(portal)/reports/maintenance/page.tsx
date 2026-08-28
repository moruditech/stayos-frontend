'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, ReadOnlyField, Icons } from '@stayos/ui';

interface GroupCount {
  _id: string;
  count: number;
}

interface MaintenanceReport {
  byStatus: GroupCount[];
  byCategory: GroupCount[];
  slaBreaches: number;
  avgResolutionHours: number;
}

export default function MaintenanceReportPage(): React.ReactElement {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'maintenance', params],
    queryFn: () => api.reports.getMaintenance(params) as unknown as Promise<MaintenanceReport>,
  });

  return (
    <div data-page="report-maintenance">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Maintenance</h1>
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
            <ReadOnlyField label="SLA breaches" value={data.slaBreaches} />
            <ReadOnlyField label="Avg. resolution time" value={`${data.avgResolutionHours} hrs`} />
          </div>

          <section data-report-section>
            <h2>By status</h2>
            <table data-table>
              <thead><tr><th>Status</th><th>Count</th></tr></thead>
              <tbody>
                {data.byStatus.map((row) => (
                  <tr key={row._id}><td>{row._id}</td><td>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section data-report-section>
            <h2>By category</h2>
            <table data-table>
              <thead><tr><th>Category</th><th>Count</th></tr></thead>
              <tbody>
                {data.byCategory.map((row) => (
                  <tr key={row._id}><td>{row._id}</td><td>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
