'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { CashierShift } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { RoleGate, PlanGate, SkeletonLoader, EmptyState, StatusBadge, DataTable, type ColumnDef } from '@stayos/ui';
import { outletKeys, shiftKeys } from '@/lib/query-keys';

export default function ShiftsPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_SHIFT_READ_ALL}
      fallback={<EmptyState title="You don't have access to shift history" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <ShiftsPageContent />
      </PlanGate>
    </RoleGate>
  );
}

function ShiftsPageContent(): React.ReactElement {
  const router = useRouter();
  const [filters, setFilters] = useState({ outletId: '', status: '', from: '', to: '', page: 1, limit: 25 });

  const { data: outletsData } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = outletsData?.data ?? [];

  const queryParams: Record<string, unknown> = { page: filters.page, limit: filters.limit };
  if (filters.outletId) queryParams.outletId = filters.outletId;
  if (filters.status) queryParams.status = filters.status;
  if (filters.from) queryParams.from = filters.from;
  if (filters.to) queryParams.to = filters.to;

  const { data, isLoading } = useQuery({
    queryKey: shiftKeys.list(queryParams),
    queryFn: () => api.restaurantShifts.list(queryParams),
  });
  const shifts = data?.data ?? [];

  const columns: ColumnDef<CashierShift>[] = [
    {
      key: 'staff',
      header: 'Staff',
      render: (s) => (typeof s.staffId === 'object' ? `${s.staffId.firstName} ${s.staffId.lastName}` : '—'),
    },
    {
      key: 'outlet',
      header: 'Outlet',
      render: (s) => (typeof s.outletId === 'object' ? s.outletId.name : '—'),
    },
    {
      key: 'till',
      header: 'Till',
      render: (s) => (typeof s.tillId === 'object' ? s.tillId.name : '—'),
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'opened', header: 'Opened', render: (s) => new Date(s.openedAt).toLocaleString('en-ZA') },
    {
      key: 'variance',
      header: 'Variance',
      render: (s) =>
        s.variance === undefined ? '—' : (
          <span style={{ color: Math.abs(s.variance) > 0.01 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            R{s.variance.toFixed(2)}
          </span>
        ),
    },
    {
      key: 'sales',
      header: 'Total sales',
      render: (s) => (s.salesSummary ? `R${s.salesSummary.totalSales.toFixed(2)}` : '—'),
    },
  ];

  return (
    <div data-page="restaurant-shifts">
      <div data-page-header>
        <h1>Cashier Shifts</h1>
      </div>

      <div data-filter-bar>
        <select data-filter-input value={filters.outletId} onChange={(e) => setFilters((f) => ({ ...f, outletId: e.target.value, page: 1 }))}>
          <option value="">All outlets</option>
          {outlets.map((o) => (
            <option key={o._id} value={o._id}>{o.name}</option>
          ))}
        </select>
        <select data-filter-input value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <input
          data-filter-input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
        />
        <input
          data-filter-input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
        />
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : shifts.length === 0 ? (
        <EmptyState title="No shifts found" description="Try a different filter." />
      ) : (
        <DataTable
          columns={columns}
          rows={shifts}
          rowKey={(s) => s._id}
          onRowClick={(s) => router.push(`/restaurant/shifts/${s._id}`)}
          {...(data?.meta ? { pagination: data.meta, onPageChange: (page: number) => setFilters((f) => ({ ...f, page })) } : {})}
        />
      )}
    </div>
  );
}
