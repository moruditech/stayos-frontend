'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useSocketEvent, DataTable } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import type { ColumnDef } from '@stayos/ui';
import type { Booking } from '@stayos/types';
import { bookingKeys } from '@/lib/query-keys';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookingsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') ?? '',
    checkIn: searchParams.get('checkIn') ?? '',
    page: 1,
    limit: 25,
  });

  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  ) as Record<string, string | number>;

  const { data: bookings, isLoading } = useQuery({
    queryKey: bookingKeys.list(cleanFilters),
    queryFn: () => api.bookings.list(cleanFilters),
  });

  // Real-time: invalidate list on any booking change
  useSocketEvent(SOCKET_EVENTS.BOOKING_CREATED, () => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  });
  useSocketEvent(SOCKET_EVENTS.BOOKING_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  });

  const columns: ColumnDef<Booking>[] = [
    {
      key: 'confirmationNumber',
      header: 'Confirmation #',
      render: (b) => (
        <a href={`/bookings/${b._id}`} data-table-link>
          {String((b as Record<string,unknown>)['confirmationNumber'] ?? b._id.slice(-8).toUpperCase())}
        </a>
      ),
    },
    {
      key: 'guestId',
      header: 'Guest',
      render: (b) => String((b as Record<string,unknown>)['guestName'] ?? b.guestId),
    },
    {
      key: 'roomId',
      header: 'Room',
      render: (b) => String((b as Record<string,unknown>)['roomNumber'] ?? b.roomId),
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
        <a href="/bookings/new" data-btn-primary>+ New booking</a>
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
          value={filters.checkIn}
          onChange={(e) => setFilters((f) => ({ ...f, checkIn: e.target.value, page: 1 }))}
          data-filter-input
          placeholder="Check-in date"
        />

        {(filters.status || filters.checkIn) && (
          <button
            type="button"
            data-btn-ghost
            onClick={() => setFilters({ status: '', checkIn: '', page: 1, limit: 25 })}
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
          action={<a href="/bookings/new" data-btn-primary>New booking</a>}
        />
      ) : (
        <DataTable columns={columns} rows={bookings} rowKey={(b) => b._id} />
      )}
    </div>
  );
}
