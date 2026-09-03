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
import { bookingKeys } from '@/lib/query-keys';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

const RESIDENCE_STATUSES = [
  { value: 'citizen', label: 'SA citizen' },
  { value: 'permanent_resident', label: 'Permanent resident' },
  { value: 'visitor_visa', label: 'Visitor visa' },
  { value: 'work_visa', label: 'Work visa' },
  { value: 'study_visa', label: 'Study visa' },
  { value: 'asylum', label: 'Asylum seeker' },
  { value: 'other', label: 'Other' },
];

// Guest register capture form — required before check-in (see
// stayos-audit-report.md G-02). Kept in this file rather than split out
// since it's tightly coupled to the one flow that needs it.
function GuestRegisterCaptureForm({
  bookingId,
  onCaptured,
}: {
  bookingId: string;
  onCaptured: () => void;
}): React.ReactElement {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [idOrPassportNumber, setIdNumber] = useState('');
  const [documentType, setDocumentType] = useState<'sa_id' | 'passport' | 'other'>('sa_id');
  const [residenceStatus, setResidenceStatus] = useState('citizen');
  const [nationality, setNationality] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [signatureAcknowledged, setSignatureAcknowledged] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const captureMutation = useMutation({
    mutationFn: () => {
      if (!idDocument) throw new Error('ID document image is required.');
      // A typed signature stands in for a captured signature pad image —
      // the backend stores whatever base64 payload is sent as signatureData.
      const signatureData = btoa(`${fullName}|${new Date().toISOString()}`);
      return api.guestregister.capture(bookingId, {
        fullName,
        idOrPassportNumber,
        documentType,
        residenceStatus,
        nationality,
        residentialAddress,
        signatureData,
        idDocument,
      });
    },
    onSuccess: () => {
      toast('Guest register entry captured.', 'success');
      onCaptured();
    },
    onError: (err: ApiError | Error) => {
      const message = 'message' in err ? err.message : 'Failed to capture guest register entry.';
      setError(message);
    },
  });

  return (
    <form
      data-form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        if (!signatureAcknowledged) {
          setError('Guest must acknowledge and sign before continuing.');
          return;
        }
        captureMutation.mutate();
      }}
    >
      <div data-form-group>
        <label htmlFor="gr-fullName">Full name</label>
        <input id="gr-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div data-form-row>
        <div data-form-group>
          <label htmlFor="gr-docType">Document type</label>
          <select id="gr-docType" value={documentType} onChange={(e) => setDocumentType(e.target.value as typeof documentType)}>
            <option value="sa_id">SA ID</option>
            <option value="passport">Passport</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div data-form-group>
          <label htmlFor="gr-idNumber">ID / passport number</label>
          <input id="gr-idNumber" value={idOrPassportNumber} onChange={(e) => setIdNumber(e.target.value)} required />
        </div>
      </div>
      <div data-form-row>
        <div data-form-group>
          <label htmlFor="gr-residence">Residence status</label>
          <select id="gr-residence" value={residenceStatus} onChange={(e) => setResidenceStatus(e.target.value)}>
            {RESIDENCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div data-form-group>
          <label htmlFor="gr-nationality">Nationality</label>
          <input id="gr-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} required />
        </div>
      </div>
      <div data-form-group>
        <label htmlFor="gr-address">Residential address</label>
        <input id="gr-address" value={residentialAddress} onChange={(e) => setResidentialAddress(e.target.value)} required />
      </div>
      <div data-form-group>
        <label htmlFor="gr-idDoc">ID document photo</label>
        <input
          id="gr-idDoc"
          type="file"
          accept="image/*"
          onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
          required
        />
      </div>
      <div data-form-group data-checkbox-group>
        <label htmlFor="gr-sign">
          <input
            id="gr-sign"
            type="checkbox"
            checked={signatureAcknowledged}
            onChange={(e) => setSignatureAcknowledged(e.target.checked)}
          />
          {' '}Guest confirms the details above are correct and consents to this record.
        </label>
      </div>

      <InlineError message={error} />

      <div data-form-actions>
        <button type="submit" data-btn-primary disabled={captureMutation.isPending}>
          {captureMutation.isPending ? 'Saving…' : 'Save and continue'}
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
    queryKey: ['guestregister', 'booking', id],
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

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (!booking) return <p>Booking not found.</p>;

  const b = booking as unknown as Record<string, unknown>;
  // The backend never sets `status` to 'pending_confirmation' — the
  // waiting-for-guest state lives in the separate `guestConfirmationStatus`
  // field (see stayos-audit-report.md M-13, same underlying bug here).
  const isPendingConfirm = b['guestConfirmationStatus'] === 'pending';
  const isCancellable = ['confirmed', 'pending'].includes(booking.status);
  const isCheckInEligible = booking.status === 'confirmed';
  const hasRegisterEntry = Boolean(registerEntry);
  const f = folio as unknown as Record<string, unknown> | undefined;

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
            <ReadOnlyField label="Guest" value={`${booking.customerId?.firstName ?? ''} ${booking.customerId?.lastName ?? ''}`.trim() || '—'} />
            <ReadOnlyField label="Room" value={booking.roomId?.roomNumber ?? '—'} />
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
            <Link href={`/bookings/${id}/edit`} data-btn-ghost>
              Edit booking
            </Link>
          )}
        </div>
      </RoleGate>

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
          onCaptured={() => {
            setShowRegisterModal(false);
            void queryClient.invalidateQueries({ queryKey: ['guestregister', 'booking', id] });
          }}
        />
      </Modal>
    </div>
  );
}

