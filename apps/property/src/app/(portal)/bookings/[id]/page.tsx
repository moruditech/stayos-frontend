'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Modal,
  InlineError,
  RoleGate,
  Icons,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { bookingKeys, guestRegisterKeys } from '@/lib/query-keys';
import { GuestRegisterCaptureForm } from '@/components/GuestRegisterCaptureForm';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

// "Enrich" form for a channel-imported (OTA/iCal) booking — see
// bookings.service.js#enrichGuest. Left blank by default rather than
// pre-filled from the current customer record: for an unenriched booking
// that record is the tenant's shared iCal placeholder ("External Guest
// (iCal)", a synthetic ical-import+... email), and resubmitting that back
// unchanged would defeat the point of this form. Only pre-filled when the
// booking already has its own dedicated, previously-enriched record.
function EnrichGuestForm({
  bookingId,
  initial,
  onSaved,
}: {
  bookingId: string;
  initial: { firstName: string; lastName: string; email: string; phone: string };
  onSaved: () => void;
}): React.ReactElement {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [nationality, setNationality] = useState('');
  const [error, setError] = useState<string | undefined>();

  const enrichMutation = useMutation({
    mutationFn: () =>
      api.bookings.enrichGuest(bookingId, {
        firstName, lastName, email, phone,
        ...(nationality.trim() ? { nationality: nationality.trim() } : {}),
      }),
    onSuccess: () => onSaved(),
    onError: (err: ApiError) => setError(err.message ?? 'Failed to save guest details.'),
  });

  return (
    <form
      data-form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        enrichMutation.mutate();
      }}
    >
      <div data-form-row>
        <div data-form-group>
          <label htmlFor="eg-firstName">First name</label>
          <input id="eg-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div data-form-group>
          <label htmlFor="eg-lastName">Last name</label>
          <input id="eg-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div data-form-group>
        <label htmlFor="eg-email">Email</label>
        <input id="eg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div data-form-row>
        <div data-form-group>
          <label htmlFor="eg-phone">Phone</label>
          <input id="eg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div data-form-group>
          <label htmlFor="eg-nationality">Nationality (optional)</label>
          <input id="eg-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
        </div>
      </div>

      <InlineError message={error} />

      <div data-form-actions>
        <button type="submit" data-btn-primary disabled={enrichMutation.isPending}>
          {enrichMutation.isPending ? 'Saving…' : 'Save guest details'}
        </button>
      </div>
    </form>
  );
}

export default function BookingDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState<string | undefined>();
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.bookings.get(id),
  });

  const { data: folio } = useQuery({
    queryKey: bookingKeys.folio(id),
    queryFn: () => api.bookings.getFolio(id),
    enabled: !!booking,
  });

  // Only relevant once the booking is confirmed and check-in becomes
  // possible — avoids an extra request on every booking detail view.
  const { data: registerEntry, isLoading: isLoadingRegister } = useQuery({
    queryKey: guestRegisterKeys.byBooking(id),
    queryFn: () => api.guestregister.getByBooking(id),
    enabled: !!booking && booking.status === 'confirmed',
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => api.bookings.cancel(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      setConfirmCancel(false);
      setCancelReason('');
      setCancelReasonError(undefined);
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

  const checkInMutation = useMutation({
    mutationFn: () => api.bookings.checkIn(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast('Guest checked in.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'GUEST_REGISTER_REQUIRED') {
        // Shouldn't normally hit this — the button is disabled until
        // registerEntry exists — but handle it defensively in case of a
        // race (e.g. another tab already checked in).
        setShowRegisterModal(true);
      } else {
        toast(err.message ?? 'Failed to check in.', 'error');
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.bookings.checkOut(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast('Guest checked out.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to check out.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (!booking) return <p>Booking not found.</p>;

  const b = booking as unknown as Record<string, unknown>;
  // The backend never sets `status` to 'pending_confirmation' — the
  // waiting-for-guest state lives in the separate `guestConfirmationStatus`
  // field (see stayos-audit-report.md M-13, same underlying bug here).
  const isPendingConfirm = b['guestConfirmationStatus'] === 'pending';
  const isCancellable = ['confirmed', 'pending'].includes(booking.status);
  const isCheckInEligible = booking.status === 'confirmed';
  const isCheckOutEligible = booking.status === 'checked_in';
  const hasRegisterEntry = Boolean(registerEntry);
  const f = folio as unknown as Record<string, unknown> | undefined;
  // See bookings.service.js#enrichGuest — only channel-imported (OTA/iCal)
  // bookings arrive as skeleton records with no real guest contact info, so
  // "Add/Edit guest details" only makes sense for those.
  const isOtaImported = Boolean(booking.externalFeedId);
  const guestName = `${booking.customerId?.firstName ?? ''} ${booking.customerId?.lastName ?? ''}`.trim() || '—';

  return (
    <div data-page="booking-detail">
      <div data-page-header>
        <div>
          <Link href="/bookings" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Bookings</Link>
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
            <ReadOnlyField label="Guest" value={guestName} />
            <ReadOnlyField label="Room" value={booking.roomId?.roomNumber ?? '—'} />
            <ReadOnlyField label="Check-in" value={fmt(booking.checkIn)} />
            <ReadOnlyField label="Check-out" value={fmt(booking.checkOut)} />
            <ReadOnlyField label="Guests" value={`${String(b['adults'] ?? 1)} adults${b['children'] ? `, ${String(b['children'])} children` : ''}`} />
            <ReadOnlyField label="Source" value={String(booking.source)} />
            <ReadOnlyField label="Email" value={booking.customerId?.email || '—'} />
            <ReadOnlyField label="Phone" value={booking.customerId?.phone || '—'} />
            {booking.externalUid && (
              <ReadOnlyField label="OTA source" value={String(b['otaSource'] ?? '—')} />
            )}
          </div>
          {isOtaImported && !booking.isEnriched && (
            <p data-notice data-notice-warning>
              This booking was imported from a channel with no guest contact details.
              Add the guest&apos;s real name, email, and phone before they arrive.
            </p>
          )}
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
                  <span data-balance={Number(f['balance']) > 0 ? 'outstanding' : 'clear'}>
                    {fmtCurrency(Number(f['balance'] ?? 0))}
                  </span>
                }
              />
              <Link href={`/folios/${String(f['_id'])}`} data-btn-ghost data-btn-sm>
                View folio
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Check-in — blocked until the guest register entry exists */}
      {isCheckInEligible && (
        <RoleGate perm={PERMISSIONS.CHECKIN_PROCESS}>
          <section data-detail-section>
            <h2>Check-in</h2>
            {isLoadingRegister ? (
              <SkeletonLoader rows={1} />
            ) : hasRegisterEntry ? (
              <div data-action-bar>
                <button
                  type="button"
                  data-btn-primary
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                >
                  {checkInMutation.isPending ? 'Checking in…' : 'Check in guest'}
                </button>
              </div>
            ) : (
              <>
                <p data-notice>
                  A guest register entry is required before this guest can be checked in.
                </p>
                <button type="button" data-btn-primary onClick={() => setShowRegisterModal(true)}>
                  Capture guest register
                </button>
              </>
            )}
          </section>
        </RoleGate>
      )}

      {/* Check-out */}
      {isCheckOutEligible && (
        <RoleGate perm={PERMISSIONS.CHECKIN_PROCESS}>
          <section data-detail-section>
            <h2>Check-out</h2>
            <div data-action-bar>
              <button
                type="button"
                data-btn-primary
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
              >
                {checkOutMutation.isPending ? 'Checking out…' : 'Check out guest'}
              </button>
            </div>
          </section>
        </RoleGate>
      )}

      {/* Actions */}
      <div data-action-bar>
        <RoleGate perm={PERMISSIONS.BOOKING_MANAGE}>
          <>
            {isCancellable && (
              <button type="button" data-btn-danger onClick={() => setConfirmCancel(true)}>
                <Icons.XCircle size={15} aria-hidden="true" />
                Cancel booking
              </button>
            )}
            {booking.status === 'confirmed' && (
              <button type="button" data-btn-danger onClick={() => setConfirmNoShow(true)}>
                <Icons.UserMinus size={15} aria-hidden="true" />
                Mark no-show
              </button>
            )}
            {['confirmed', 'pending_confirmation'].includes(booking.status) && (
              <Link href={`/bookings/${id}/edit`} data-btn-secondary>
                <Icons.Pencil size={15} aria-hidden="true" />
                Edit booking
              </Link>
            )}
            {isOtaImported && (
              <button type="button" data-btn-secondary onClick={() => setShowEnrichModal(true)}>
                <Icons.UserPlus size={15} aria-hidden="true" />
                {booking.isEnriched ? 'Edit guest details' : 'Add guest details'}
              </button>
            )}
          </>
        </RoleGate>
        <RoleGate perm={PERMISSIONS.MESSAGING_MANAGE}>
          <Link href={`/guest-messages?bookingId=${id}`} data-btn-secondary>
            <Icons.MessageCircle size={15} aria-hidden="true" />
            Chat with guest
          </Link>
        </RoleGate>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => {
          setConfirmCancel(false);
          setCancelReason('');
          setCancelReasonError(undefined);
        }}
        title="Cancel this booking?"
      >
        <p data-modal-message>
          This will release the room. The guest will receive a cancellation notification.
        </p>
        <div data-form-group>
          <label htmlFor="cancelReason">Cancellation reason</label>
          <textarea
            id="cancelReason"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            maxLength={1000}
          />
          <InlineError message={cancelReasonError} />
        </div>
        <div data-modal-actions>
          <button
            type="button"
            data-btn-ghost
            onClick={() => {
              setConfirmCancel(false);
              setCancelReason('');
              setCancelReasonError(undefined);
            }}
          >
            Keep booking
          </button>
          <button
            type="button"
            data-btn-primary
            data-destructive
            disabled={cancelMutation.isPending}
            onClick={() => {
              const reason = cancelReason.trim();
              if (!reason) {
                setCancelReasonError('Cancellation reason is required.');
                return;
              }
              cancelMutation.mutate(reason);
            }}
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </Modal>

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

      <Modal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Capture guest register"
      >
        <GuestRegisterCaptureForm
          bookingId={id}
          defaultFullName={`${booking.customerId?.firstName ?? ''} ${booking.customerId?.lastName ?? ''}`.trim() || undefined}
          onCaptured={() => {
            setShowRegisterModal(false);
            void queryClient.invalidateQueries({ queryKey: guestRegisterKeys.byBooking(id) });
          }}
        />
      </Modal>

      <Modal
        open={showEnrichModal}
        onClose={() => setShowEnrichModal(false)}
        title={booking.isEnriched ? 'Edit guest details' : 'Add guest details'}
      >
        <EnrichGuestForm
          bookingId={id}
          initial={
            booking.isEnriched
              ? {
                  firstName: booking.customerId?.firstName ?? '',
                  lastName:  booking.customerId?.lastName ?? '',
                  email:     booking.customerId?.email ?? '',
                  phone:     booking.customerId?.phone ?? '',
                }
              : { firstName: '', lastName: '', email: '', phone: '' }
          }
          onSaved={() => {
            setShowEnrichModal(false);
            // .all invalidates every ['bookings', ...] query — the list page
            // and dashboard arrival/departure cards should show the real
            // guest name next time they're viewed too, not just this page.
            void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
            toast('Guest details saved.', 'success');
          }}
        />
      </Modal>
    </div>
  );
}

