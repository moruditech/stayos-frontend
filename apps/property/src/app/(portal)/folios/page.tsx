'use client';

import Link from 'next/link';

/**
 * Folios & Checkout — list of open folios for currently checked-in (or
 * recently checked-out) guests.
 *
 * Previously derived "folios" client-side by filtering the bookings list
 * for a truthy folioId, which — while that field does exist and is
 * correctly set at booking creation — was a fragile workaround for a
 * missing backend endpoint (see the old comment this replaced). Now backed
 * by a real GET /folios, filtered by the associated booking's status
 * rather than the folio's own open/settled/disputed billing state, since
 * "is this guest currently staying" is a booking-lifecycle question.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge, ConfirmDialog, useToast } from '@stayos/ui';
import { folioKeys } from '@/lib/query-keys';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

export default function FoliosPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookingStatus, setBookingStatus] = useState<'checked_in' | 'checked_out'>('checked_in');
  const [checkoutTarget, setCheckoutTarget] = useState<{ bookingId: string; guestName: string; balance: number } | null>(null);

  const { data: folios, isLoading } = useQuery({
    queryKey: folioKeys.list({ bookingStatus }),
    queryFn: () => api.folios.list({ bookingStatus }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (bookingId: string) => api.bookings.checkOut(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: folioKeys.list({ bookingStatus }) });
      setCheckoutTarget(null);
      toast('Guest checked out.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Could not check out this guest.', 'error'),
  });

  return (
    <div data-page="folios">
      <div data-page-header>
        <div>
          <h1>Folios &amp; Checkout</h1>
        </div>
      </div>

      <div data-filter-bar>
        <div data-filter-select>
          <span>Status</span>
          <select
            value={bookingStatus}
            onChange={(e) => setBookingStatus(e.target.value as 'checked_in' | 'checked_out')}
          >
            <option value="checked_in">Currently checked in</option>
            <option value="checked_out">Checked out</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : !folios || folios.length === 0 ? (
        <div data-empty-state>
          <p data-empty-title>No folios found</p>
          <p data-empty-note>
            Folios appear here once a guest has checked in and a folio has been opened for their stay.
          </p>
        </div>
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Room</th>
              <th>Confirmation</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {folios.map((f) => {
              const room = typeof f.bookingId.roomId === 'object' ? f.bookingId.roomId.roomNumber : '—';
              const guestName = f.customerId ? `${f.customerId.firstName} ${f.customerId.lastName}` : 'Guest';
              const hasBalance = f.balance > 0;

              return (
                <tr key={f._id} data-row-clickable={false}>
                  <td>{guestName}</td>
                  <td>Room {room}</td>
                  <td>{f.bookingId.confirmationNumber}</td>
                  <td data-amount>
                    <span data-balance={hasBalance ? 'outstanding' : 'clear'}>{fmtCurrency(f.balance)}</span>
                  </td>
                  <td><StatusBadge status={f.status} /></td>
                  <td data-row-actions>
                    <Link href={`/folios/${f._id}`} data-btn-ghost data-btn-sm>View folio</Link>
                    {f.bookingId.status === 'checked_in' && (
                      <button
                        type="button" data-btn-primary data-btn-sm
                        onClick={() => setCheckoutTarget({ bookingId: f.bookingId._id, guestName, balance: f.balance })}
                      >
                        Check out
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={!!checkoutTarget}
        title={`Check out ${checkoutTarget?.guestName ?? 'this guest'}?`}
        message={
          checkoutTarget && checkoutTarget.balance > 0
            ? `This guest still has an outstanding balance of ${fmtCurrency(checkoutTarget.balance)}. They'll be checked out regardless — settle the folio first if it should be paid before they leave.`
            : 'This marks the booking as checked out and frees up the room.'
        }
        confirmLabel="Check out"
        cancelLabel="Cancel"
        destructive={!!checkoutTarget && checkoutTarget.balance > 0}
        onConfirm={() => { if (checkoutTarget) checkOutMutation.mutate(checkoutTarget.bookingId); }}
        onCancel={() => setCheckoutTarget(null)}
      />
    </div>
  );
}
