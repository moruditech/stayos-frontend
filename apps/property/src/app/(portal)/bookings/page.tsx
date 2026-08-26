'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useSocketEvent, DataTable } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import Link from 'next/link';
import type { ColumnDef } from '@stayos/ui';
import type { PopulatedBooking } from '@stayos/types';
import { bookingKeys } from '@/lib/query-keys';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BookingsPageInner(): React.ReactElement {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') ?? '',
    checkInFrom: searchParams.get('checkInFrom') ?? '',
    page: 1,
    limit: 25,
  });

  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  ) as Record<string, unknown>;

  const { data: bookings, isLoading } = useQuery({
    queryKey: bookingKeys.list(cleanFilters),
    queryFn: () => api.bookings.list(cleanFilters as Parameters<typeof api.bookings.list>[0]),
  });

  // Real-time: invalidate list on any booking change
  useSocketEvent(SOCKET_EVENTS.BOOKING_CREATED, () => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  });
  useSocketEvent(SOCKET_EVENTS.BOOKING_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  });

  const columns: ColumnDef<PopulatedBooking>[] = [
    {
      key: 'confirmationNumber',
      header: 'Confirmation #',
      render: (b) => (
        <Link href={`/bookings/${b._id}`} data-table-link>
          {String((b as unknown as Record<string,unknown>)['confirmationNumber'] ?? b._id.slice(-8).toUpperCase())}
        </Link>
      ),
    },
    {
      key: 'customerId',
      header: 'Guest',
      // customerId arrives populated (firstName/lastName) on this endpoint —
      // see @stayos/types#PopulatedBooking.
      render: (b) => `${b.customerId?.firstName ?? ''} ${b.customerId?.lastName ?? ''}`.trim() || '—',
    },
    {
      key: 'roomId',
      header: 'Room',
      render: (b) => b.roomId?.roomNumber ?? '—',
    },
    {
      key: 'checkIn',
      header: 'Check-in',
      render: (b) => formatDate(b.checkIn),
    },
    {
      key: 'checkOut',
      header: 'Check-out',
      render: (b) => formatDate(b.checkOut),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (b) =>
        new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(b.totalAmount),
    },
  ];

  return (
    <div data-page="bookings">
      <div data-page-header>
        <h1>Bookings</h1>
        <Link href="/bookings/new" data-btn-primary>+ New booking</Link>
      </div>

      {/* Filters */}
      <div data-filter-bar>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          data-filter-select
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked in</option>
          <option value="checked_out">Checked out</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No show</option>
          <option value="pending_confirmation">Pending confirmation</option>
        </select>

        <input
          type="date"
          value={filters.checkInFrom}
          onChange={(e) => setFilters((f) => ({ ...f, checkInFrom: e.target.value, page: 1 }))}
          data-filter-input
          placeholder="Check-in from"
        />

        {(filters.status || filters.checkInFrom) && (
          <button
            type="button"
            data-btn-ghost
            onClick={() => setFilters({ status: '', checkInFrom: '', page: 1, limit: 25 })}
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : !bookings?.length ? (
        <EmptyState
          title="No bookings found"
          description="Try adjusting your filters, or create a new booking."
          action={<Link href="/bookings/new" data-btn-primary>New booking</Link>}
        />
      ) : (
        <DataTable columns={columns} rows={bookings ?? []} rowKey={(b) => b._id} />
      )}
    </div>
  );
}

export default function BookingsPage(): React.ReactElement {
  return (
    <React.Suspense fallback={<></>}>
      <BookingsPageInner />
    </React.Suspense>
  );
}
