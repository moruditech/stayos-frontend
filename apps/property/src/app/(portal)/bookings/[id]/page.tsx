'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  StatusBadge,
  ReadOnlyField,
  useToast,
  ConfirmDialog,
  RoleGate,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { bookingKeys } from '@/lib/query-keys';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

export default function BookingDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmNoShow, setConfirmNoShow] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.bookings.get(id),
  });

  const { data: folio } = useQuery({
    queryKey: bookingKeys.folio(id),
    queryFn: () => api.bookings.getFolio(id),
    enabled: !!booking,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.bookings.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      setConfirmCancel(false);
      toast('Booking cancelled.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to cancel.', 'error'),
  });

  const noShowMutation = useMutation({
    mutationFn: () => api.bookings.noShow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      setConfirmNoShow(false);
      toast('Booking marked as no-show.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (!booking) return <p>Booking not found.</p>;

  const b = booking as unknown as Record<string, unknown>;
  const isPendingConfirm = booking.status === 'pending_confirmation';
  const isCancellable = ['confirmed', 'pending_confirmation'].includes(booking.status);
  const f = folio as Record<string, unknown> | undefined;

  return (
    <div data-page="booking-detail">
      <div data-page-header>
        <div>
          <a href="/bookings" data-breadcrumb>← Bookings</a>
          <h1>Booking {String(b['confirmationNumber'] ?? id.slice(-8).toUpperCase())}</h1>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Pending-confirmation notice */}
      {isPendingConfirm && (
        <div role="status" data-notice data-notice-warning>
          This booking is waiting for the guest to confirm. The room is held. If the
          guest does not confirm within 24 hours, the booking will be automatically
          cancelled.
        </div>
      )}

      <div data-detail-grid>
        <section data-detail-section>
          <h2>Stay details</h2>
          <div data-field-list>
            <ReadOnlyField label="Guest" value={String(b['guestName'] ?? booking.guestId)} />
            <ReadOnlyField label="Room" value={String(b['roomNumber'] ?? booking.roomId)} />
            <ReadOnlyField label="Check-in" value={fmt(booking.checkIn)} />
            <ReadOnlyField label="Check-out" value={fmt(booking.checkOut)} />
            <ReadOnlyField label="Guests" value={`${String(b['adults'] ?? 1)} adults${b['children'] ? `, ${String(b['children'])} children` : ''}`} />
            <ReadOnlyField label="Source" value={String(booking.source)} />
            {booking.externalUid && (
              <ReadOnlyField label="OTA source" value={String(b['otaSource'] ?? '—')} />
            )}
          </div>
        </section>

        <section data-detail-section>
          <h2>Financial summary</h2>
          <div data-field-list>
            <ReadOnlyField label="Rate/night" value={fmtCurrency(booking.ratePerNight)} />
            <ReadOnlyField label="Subtotal" value={fmtCurrency(booking.subTotal)} />
            <ReadOnlyField label="Tax (15% VAT)" value={fmtCurrency(booking.taxAmount)} />
            <ReadOnlyField label="Total" value={fmtCurrency(booking.totalAmount)} />
          </div>
          {f && (
            <div data-folio-summary>
              <ReadOnlyField
                label="Balance due"
                value={
                  <span data-balance={Number(f['balanceDue']) > 0 ? 'outstanding' : 'clear'}>
                    {fmtCurrency(Number(f['balanceDue'] ?? 0))}
                  </span>
                }
              />
              <a href={`/folios/${String(f['_id'])}`} data-btn-ghost data-btn-sm>
                View folio
              </a>
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      <RoleGate perm={PERMISSIONS.BOOKING_MANAGE}>
        <div data-action-bar>
          {isCancellable && (
            <button type="button" data-btn-ghost onClick={() => setConfirmCancel(true)}>
              Cancel booking
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button type="button" data-btn-ghost onClick={() => setConfirmNoShow(true)}>
              Mark no-show
            </button>
          )}
          {['confirmed', 'pending_confirmation'].includes(booking.status) && (
            <a href={`/bookings/${id}/edit`} data-btn-ghost>
              Edit booking
            </a>
          )}
        </div>
      </RoleGate>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this booking?"
        message="This will release the room. The guest will receive a cancellation notification."
        confirmLabel="Cancel booking"
        cancelLabel="Keep"
        destructive
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        open={confirmNoShow}
        title="Mark as no-show?"
        message="This records that the guest did not arrive. The room will be marked as available."
        confirmLabel="Mark no-show"
        cancelLabel="Go back"
        destructive
        onConfirm={() => noShowMutation.mutate()}
        onCancel={() => setConfirmNoShow(false)}
      />
    </div>
  );
}
