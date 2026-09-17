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

function FoodCostInner(): React.ReactElement {
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
    queryKey: reportKeys.restaurantFoodCost(params),
    queryFn: () => api.restaurantReports.getFoodCost(params),
  });

  return (
    <div data-page="report-restaurant-food-cost">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Food Cost</h1>
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
            <ReadOnlyField label="Revenue" value={fmt(data.revenue)} />
            <ReadOnlyField label="Theoretical cost" value={fmt(data.theoreticalCost)} />
            <ReadOnlyField label="Actual cost" value={fmt(data.actualCost)} />
            <ReadOnlyField label="Variance" value={fmt(data.variance)} />
          </div>

          <section data-report-section>
            <h2>Food cost %</h2>
            <table data-table>
              <thead><tr><th></th><th>Theoretical</th><th>Actual</th></tr></thead>
              <tbody>
                <tr>
                  <td>Food cost %</td>
                  <td>{data.theoreticalFoodCostPercent.toFixed(1)}%</td>
                  <td>{data.actualFoodCostPercent.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
            <p data-field-hint style={{ marginTop: 'var(--space-3)' }}>
              Theoretical cost is derived from recipe-driven stock consumption as orders are delivered.
              Actual cost additionally accounts for wastage and stock-take adjustments recorded in the same period —
              the gap between the two is where shrinkage, over-portioning, or pricing drift shows up.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

export default function FoodCostReportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_REPORTS_READ}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this report." />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <FoodCostInner />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}
