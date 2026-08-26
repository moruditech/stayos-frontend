'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, ConfirmDialog, useToast, Icons } from '@stayos/ui';
import { bookingKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

export default function BookingDetailPage({ params }: Props): React.ReactElement {
  const session     = useSession();
  const router      = useRouter();
  const qc          = useQueryClient();
  const { toast }   = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: bookingKeys.detail(params.id),
    queryFn:  () => api.customer.getBooking(params.id),
    enabled:  !!session,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.bookings.cancel(params.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.list() });
      qc.invalidateQueries({ queryKey: bookingKeys.detail(params.id) });
      toast('Booking cancelled successfully.', 'success');
      setCancelOpen(false);
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Cancellation failed.', 'error');
      setCancelOpen(false);
    },
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const b   = booking as Record<string, unknown> | undefined;
  if (!b)   return <div data-page><p>Booking not found.</p></div>;

  const status      = b['status'] as string;
  const checkIn     = new Date(b['checkIn'] as string);
  const checkOut    = new Date(b['checkOut'] as string);
  const nights      = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
  const daysUntil   = Math.ceil((checkIn.getTime() - Date.now()) / 86400000);
  const depositPaid = b['depositPaid'] as boolean | undefined;
  const digitalKey  = b['digitalKey'] as string | undefined;
  const isUpcoming  = status === 'confirmed' && daysUntil > 0;
  const isPendingConfirm = status === 'pending_confirmation';
  // OTA import with incomplete guest details
  const needsProfile = b['source'] !== 'direct' && !(b['guestIdVerified'] as boolean);

  const fmt = (d: Date) => d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to bookings
      </button>

      <h1 data-page-title>Booking details</h1>

      {/* Pending-confirmation warning */}
      {isPendingConfirm && (
        <div data-card-padded style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)', marginBottom: 'var(--space-5)' }}>
          <strong style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.AlertTriangle size={16} /> Confirmation required
          </strong>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)', marginTop: 'var(--space-1)' }}>
            Please confirm this booking within 24 hours, otherwise it will be automatically cancelled and the room released.
          </p>
          <button type="button" data-btn-primary style={{ marginTop: 'var(--space-3)' }}
            onClick={() => void api.customer.getBooking(params.id)}>
            Confirm booking
          </button>
        </div>
      )}

      {/* OTA profile-completion prompt */}
      {needsProfile && (
        <div data-card-padded style={{ background: 'var(--color-info-bg)', borderColor: 'var(--color-info)', marginBottom: 'var(--space-5)' }}>
          <strong style={{ color: 'var(--color-info)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.Info size={16} /> Complete your profile
          </strong>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-info)', marginTop: 'var(--space-1)' }}>
            Complete your guest profile before check-in to unlock digital key access and self-check-in features.
          </p>
          <Link href="/id-verification" data-btn-primary style={{ marginTop: 'var(--space-3)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            Complete profile <Icons.ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-5)' }}>

        {/* Property summary */}
        <div data-card>
          <div style={{ aspectRatio: '16/6', background: 'var(--color-surface-muted)', overflow: 'hidden' }}>
            {/* Image: /images/properties/[tenantId]-banner.jpg */}
            <img src={`/images/properties/${b['tenantId'] as string}-banner.jpg`} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-1)' }}>
                  {b['propertyName'] as string ?? 'Property'}
                </h2>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Icons.MapPin size={14} /> {b['propertyCity'] as string ?? '—'}
                </div>
              </div>
              <span data-status-badge data-status={status}>{status.replace(/_/g, ' ')}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Check-in</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{fmt(checkIn)}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Check-out</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{fmt(checkOut)}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Room type</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{b['roomType'] as string ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Guests</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{b['guests'] as number ?? 1} guest{(b['guests'] as number) !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              Booking #{b['confirmationNumber'] as string ?? params.id}
            </div>

            {isUpcoming && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>
                <Icons.Calendar size={16} /> Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Payment state */}
        <div data-card-padded>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-5)' }}>Payment summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: `${nights} night${nights !== 1 ? 's' : ''} × R${(b['ratePerNight'] as number ?? 0).toLocaleString()}`, amount: b['subTotal'] as number },
              { label: 'Taxes & fees', amount: b['taxAmount'] as number },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <span>{row.label}</span>
                <span>R{(row.amount ?? 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)' }}>
              <span>Total</span>
              <span>R{(b['totalAmount'] as number ?? 0).toLocaleString()}</span>
            </div>
          </div>
          {depositPaid && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icons.CheckCircle2 size={16} /> Deposit paid: R{(b['depositAmount'] as number ?? 0).toLocaleString()}
            </div>
          )}
          {(b['balanceDue'] as number) > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
                Balance due: R{(b['balanceDue'] as number).toLocaleString()}
              </div>
              <Link href={`/bookings/${params.id}/pay-balance`} data-btn-primary data-btn-full>Pay balance now</Link>
            </div>
          )}
        </div>

        {/* Digital key / self-check-in */}
        {digitalKey && (
          <div data-card-padded style={{ borderColor: 'var(--color-primary)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icons.KeyRound size={18} /> Digital key &amp; self check-in
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Your digital key is ready. Use it to access the property on your check-in date.
            </p>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-lg)', textAlign: 'center', fontFamily: 'monospace', fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', letterSpacing: '0.3em', marginBottom: 'var(--space-4)' }}>
              {digitalKey}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Valid from {fmt(checkIn)} until {fmt(checkOut)}
            </p>
          </div>
        )}

        {/* Actions */}
        {isUpcoming && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Link href={`/bookings/${params.id}/reschedule`} data-btn-secondary data-btn-full style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
              <Icons.Calendar size={16} /> Modify booking dates
            </Link>
            <button type="button" data-btn-ghost data-btn-full
              onClick={() => setCancelOpen(true)}
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
              Cancel booking
            </button>
          </div>
        )}

        {/* Folio / invoice link */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link href={`/bookings/${params.id}/folio`} data-btn-ghost style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <Icons.FileText size={16} /> View invoice
          </Link>
          <Link href={`/support/new?ref=${params.id}`} data-btn-ghost style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <Icons.MessageCircle size={16} /> Contact property
          </Link>
        </div>
      </div>

      {/* Cancel confirm dialog */}
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this booking?"
        message="This action cannot be undone. Cancellation fees may apply depending on the property's policy."
        confirmLabel={cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel booking'}
        cancelLabel="Keep booking"
        destructive
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
