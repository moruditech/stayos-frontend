'use client';

/**
 * Folio list — entry point for the "Folios & Checkout" nav item (M-08).
 *
 * The backend has no standalone `GET /folios` list endpoint (see
 * stayos-audit-report.md M-08). Rather than add and maintain a parallel
 * folio-listing route on the backend, this page reuses the existing
 * `GET /bookings` endpoint filtered to bookings that have an open folio
 * (checked_in or checked_out) and links each row to `/folios/:folioId`.
 *
 * If a true backend-side folio list is added later, swap the `useQuery`
 * below for a call to `api.folios.list()` and drop the booking-derived
 * columns that don't apply (e.g. room/guest come pre-populated on bookings
 * but would need a populate step on a dedicated folios endpoint).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, DataTable } from '@stayos/ui';
import type { ColumnDef } from '@stayos/ui';
import type { PopulatedBooking } from '@stayos/types';
import { bookingKeys } from '@/lib/query-keys';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

export default function FoliosListPage(): React.ReactElement {
  const [status, setStatus] = useState<'checked_in' | 'checked_out'>('checked_in');

  const filters = { status, limit: 100 };

  const { data: bookings, isLoading } = useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => api.bookings.list(filters as Parameters<typeof api.bookings.list>[0]),
  });

  // Only bookings that actually have a folio attached are relevant here.
  const rows = (bookings ?? []).filter((b) => Boolean(b.folioId));

  const columns: ColumnDef<PopulatedBooking>[] = [
    {
      key: 'confirmationNumber',
      header: 'Confirmation #',
      render: (b) => (
        <Link href={`/folios/${b.folioId}`} data-table-link>
          {String((b as unknown as Record<string, unknown>)['confirmationNumber'] ?? b._id.slice(-8).toUpperCase())}
        </Link>
      ),
    },
    {
      key: 'customerId',
      header: 'Guest',
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
      header: 'Booking status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (b) => fmtCurrency(b.totalAmount),
    },
    {
      key: 'folioId',
      header: '',
      render: (b) => (
        <Link href={`/folios/${b.folioId}`} data-btn-ghost data-btn-sm>
          Open folio
        </Link>
      ),
    },
  ];

  return (
    <div data-page="folios">
      <div data-page-header>
        <h1>Folios &amp; Checkout</h1>
      </div>

      <div data-filter-bar>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'checked_in' | 'checked_out')}
          data-filter-select
        >
          <option value="checked_in">Currently checked in</option>
          <option value="checked_out">Checked out</option>
        </select>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No folios found"
          description="Folios appear here once a guest has checked in and a folio has been opened for their stay."
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(b) => b._id} />
      )}
    </div>
  );
}
