'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { RoleGate, PlanGate, SkeletonLoader, EmptyState, Icons } from '@stayos/ui';
import { outletKeys, reportKeys } from '@/lib/query-keys';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function TabAgingInner(): React.ReactElement {
  const [outletId, setOutletId] = useState('');

  const { data: outletsData } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = outletsData?.data ?? [];

  const params: Record<string, unknown> = {};
  if (outletId) params.outletId = outletId;

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.restaurantTabAging(params),
    queryFn: () => api.restaurantReports.getTabAging(params),
    // Current-state report — a stale idle-time figure defeats the point.
    refetchInterval: 60_000,
  });

  return (
    <div data-page="report-restaurant-tab-aging">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Tab Aging</h1>
        </div>
      </div>

      <div data-filter-bar>
        <select data-filter-input value={outletId} onChange={(e) => setOutletId(e.target.value)}>
          <option value="">All outlets</option>
          {outlets.map((o) => (
            <option key={o._id} value={o._id}>{o.name}</option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : data.length === 0 ? (
        <EmptyState title="No open tabs" description="Every tab is currently settled or void." />
      ) : (
        <table data-table>
          <thead><tr><th>Tab</th><th>Table</th><th>Total</th><th>Age</th><th>Idle</th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.tabId}>
                <td><Link href={`/restaurant/tabs/${row.tabId}`} data-link>{row.label}</Link></td>
                <td>{row.tableLabel ?? 'Takeaway'}</td>
                <td>{fmt(row.total)}</td>
                <td>{row.ageMinutes} min</td>
                <td style={{ color: row.isIdle ? 'var(--color-danger)' : undefined, fontWeight: row.isIdle ? 700 : undefined }}>
                  {row.idleMinutes} min{row.isIdle ? ' — flagged' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function TabAgingReportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_REPORTS_READ}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this report." />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <TabAgingInner />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}
