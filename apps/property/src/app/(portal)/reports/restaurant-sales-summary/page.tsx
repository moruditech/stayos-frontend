'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { RoleGate, PlanGate, SkeletonLoader, ReadOnlyField, EmptyState, Icons } from '@stayos/ui';
import { outletKeys, reportKeys } from '@/lib/query-keys';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function SalesSummaryInner(): React.ReactElement {
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
    queryKey: reportKeys.restaurantSalesSummary(params),
    queryFn: () => api.restaurantReports.getSalesSummary(params),
  });

  return (
    <div data-page="report-restaurant-sales-summary">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Sales Summary</h1>
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
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Total sales" value={fmt(data.totalSales)} />
            <ReadOnlyField label="Tips" value={fmt(data.totalTips)} />
            <ReadOnlyField label="Refunds" value={fmt(data.totalRefunds)} />
            <ReadOnlyField label="Discounts given" value={fmt(data.discountsGiven)} />
            <ReadOnlyField label="Voids" value={String(data.voidCount)} />
          </div>

          <section data-report-section>
            <h2>By payment method</h2>
            {data.byMethod.length === 0 ? (
              <EmptyState title="No payments in this range" />
            ) : (
              <table data-table>
                <thead><tr><th>Method</th><th>Amount</th><th>Tips</th><th>Count</th></tr></thead>
                <tbody>
                  {data.byMethod.map((row) => (
                    <tr key={row.method}>
                      <td>{row.method === 'card_yoco' ? 'Card (Yoco)' : row.method === 'room_charge' ? 'Room charge' : 'Cash'}</td>
                      <td>{fmt(row.amount)}</td>
                      <td>{fmt(row.tips)}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function SalesSummaryReportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_REPORTS_READ}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this report." />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <SalesSummaryInner />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}
