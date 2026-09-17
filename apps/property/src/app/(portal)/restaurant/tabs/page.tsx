'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { PosTab } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES, SOCKET_EVENTS } from '@stayos/constants';
import { RoleGate, PlanGate, SkeletonLoader, EmptyState, StatusBadge, DataTable, useSocketEvent, type ColumnDef } from '@stayos/ui';
import { outletKeys, tabKeys } from '@/lib/query-keys';

const STATUS_OPTIONS = ['', 'open', 'settled', 'void'] as const;

export default function TabsPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_TAB_MANAGE}
      fallback={<EmptyState title="You don't have access to tabs oversight" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <TabsPageContent />
      </PlanGate>
    </RoleGate>
  );
}

function TabsPageContent(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ outletId: '', status: '', page: 1, limit: 25 });

  const { data: outletsData } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = outletsData?.data ?? [];

  const queryParams: Record<string, unknown> = { page: filters.page, limit: filters.limit };
  if (filters.outletId) queryParams.outletId = filters.outletId;
  if (filters.status) queryParams.status = filters.status;

  const { data, isLoading } = useQuery({
    queryKey: tabKeys.list(queryParams),
    queryFn: () => api.restaurantTabs.list(queryParams),
  });
  const tabs = data?.data ?? [];

  // Tab-idle alerts and any tab/table status change both invalidate this list —
  // a manager watching this page should see a newly-flagged tab appear live.
  useSocketEvent(SOCKET_EVENTS.POS_TAB_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: tabKeys.list(queryParams) });
  });
  useSocketEvent(SOCKET_EVENTS.POS_TAB_IDLE_ALERT, () => {
    void queryClient.invalidateQueries({ queryKey: tabKeys.list(queryParams) });
  });

  const columns: ColumnDef<PosTab>[] = [
    { key: 'label', header: 'Tab', render: (t) => t.label },
    {
      key: 'table',
      header: 'Table',
      render: (t) => (typeof t.tableId === 'object' && t.tableId ? t.tableId.label : 'Takeaway'),
    },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'total', header: 'Total', render: (t) => `R${t.total.toFixed(2)}` },
    { key: 'paid', header: 'Paid', render: (t) => `R${t.paidTotal.toFixed(2)}` },
    { key: 'opened', header: 'Opened', render: (t) => new Date(t.openedAt).toLocaleString('en-ZA') },
    {
      key: 'lastActivity',
      header: 'Last activity',
      render: (t) => new Date(t.lastActivityAt).toLocaleString('en-ZA'),
    },
  ];

  return (
    <div data-page="restaurant-tabs">
      <div data-page-header>
        <h1>Tabs</h1>
      </div>

      <div data-filter-bar>
        <select
          data-filter-input
          value={filters.outletId}
          onChange={(e) => setFilters((f) => ({ ...f, outletId: e.target.value, page: 1 }))}
        >
          <option value="">All outlets</option>
          {outlets.map((o) => (
            <option key={o._id} value={o._id}>{o.name}</option>
          ))}
        </select>
        <select
          data-filter-input
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : tabs.length === 0 ? (
        <EmptyState title="No tabs found" description="Try a different outlet or status filter." />
      ) : (
        <DataTable
          columns={columns}
          rows={tabs}
          rowKey={(t) => t._id}
          onRowClick={(t) => router.push(`/restaurant/tabs/${t._id}`)}
          {...(data?.meta ? { pagination: data.meta, onPageChange: (page: number) => setFilters((f) => ({ ...f, page })) } : {})}
        />
      )}
    </div>
  );
}
