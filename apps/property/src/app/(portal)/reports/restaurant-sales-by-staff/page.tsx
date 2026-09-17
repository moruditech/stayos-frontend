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

function SalesByStaffInner(): React.ReactElement {
  const [outletId, setOutletId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: outletsData } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = outletsData?.data ?? [];

  const params: Record<string, unknown> = {};
  if (outletId) params.outletId = outletId;
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.restaurantSalesByStaff(params),
    queryFn: () => api.restaurantReports.getSalesByStaff(params),
  });

  return (
    <div data-page="report-restaurant-sales-by-staff">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Sales by Staff</h1>
        </div>
      </div>

      <div data-filter-bar>
        <select data-filter-input value={outletId} onChange={(e) => setOutletId(e.target.value)}>
          <option value="">All outlets</option>
          {outlets.map((o) => (
            <option key={o._id} value={o._id}>{o.name}</option>
          ))}
        </select>
        <input type="date" data-filter-input value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" data-filter-input value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : data.byStaff.length === 0 ? (
        <EmptyState title="No closed shifts in this range" />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Staff</th><th>Role</th><th>Shifts</th><th>Total sales</th><th>Tips</th><th>Discounts</th><th>Voids</th></tr>
          </thead>
          <tbody>
            {data.byStaff.map((row, i) => (
              <tr key={i}>
                <td>{row.staffName}</td>
                <td>{row.role ?? '—'}</td>
                <td>{row.shiftCount}</td>
                <td>{fmt(row.totalSales)}</td>
                <td>{fmt(row.tipsTotal)}</td>
                <td>{fmt(row.discountsTotal)}</td>
                <td>{row.voidsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function SalesByStaffReportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_REPORTS_READ}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this report." />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <SalesByStaffInner />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}
