'use client';
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import type { PublicBookingInput } from '@stayos/validators';
import { SkeletonLoader, EmptyState, useToast, Icons } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';

const CONSENT_TEXT =
  'I consent to my personal information being shared with this property ' +
  'for the purpose of processing my booking.';

interface Props { params: { slug: string } }

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function BookRoomPage({ params }: Props): React.ReactElement {
  const slug         = params.slug;
  const router       = useRouter();
  const searchParams = useSearchParams();
  const roomId       = searchParams.get('roomId');
  const { toast }    = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults]     = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [agreed, setAgreed]     = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const { data: property, isLoading: loadingProperty } = useQuery({
    queryKey: accommodationKeys.detail(slug),
    queryFn:  () => api.discovery.getProperty(slug),
  });

  const { data: rooms, isLoading: loadingRooms } = useQuery({
    queryKey: accommodationKeys.rooms(slug),
    queryFn:  () => api.discovery.getPropertyRooms(slug),
  });

  const room = useMemo(() => {
    const list = (rooms as Record<string, unknown>[] | undefined) ?? [];
    return list.find((r) => r['_id'] === roomId);
  }, [rooms, roomId]);

  const nights = nightsBetween(checkIn, checkOut);
  const rate   = room?.['baseRate'] as number | null | undefined;
  const total  = typeof rate === 'number' && nights > 0 ? rate * nights : null;
  const maxGuests = (room?.['capacity'] as number | undefined) ?? (room?.['adultCapacity'] as number | undefined) ?? 10;

  const bookMutation = useMutation({
    mutationFn: (input: PublicBookingInput) => api.bookings.createPublic(input),
    onSuccess:  (result) => {
      // `result` is a fully-typed `Booking` (see @stayos/types/booking) —
      // `_id` is a required field, so no cast or fallback is needed here.
      setConfirmed(result._id);
    },
    onError: (err: ApiError) => {
      if (err.code === 'BOOKING_CONFLICT') {
        setFormError('This room is no longer available for the selected dates. Please try different dates.');
      } else if (err.code === 'VALIDATION_ERROR') {
        setFormError('Please check the form for missing or invalid details.');
      } else {
        toast(err.message ?? 'Failed to create booking.', 'error');
      }
    },
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setFormError(null);

    if (!roomId) {
      setFormError('No room selected. Please go back and choose a room.');
      return;
    }
    if (!checkIn || !checkOut) {
      setFormError('Please select a check-in and check-out date.');
      return;
    }
    if (nights <= 0) {
      setFormError('Check-out must be after check-in.');
      return;
    }
    if (!agreed) {
      setFormError('You must accept the terms and consent to continue.');
      return;
    }

    bookMutation.mutate({
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      source: 'direct',
      specialRequests: specialRequests || undefined,
      consentSnapshot: { acknowledged: true, text: CONSENT_TEXT },
    });
  }

  const isLoading = loadingProperty || loadingRooms;

  if (isLoading) {
    return <div data-page><SkeletonLoader rows={6} /></div>;
  }

  if (!property || !roomId || !room) {
    return (
      <div data-page>
        <EmptyState title="Room not found"
          description="This room may no longer be available. Please choose another room."
          action={<button type="button" data-btn-primary onClick={() => router.push(`/accommodation/${slug}`)}>Back to property</button>} />
      </div>
    );
  }

  const p = property as Record<string, unknown>;

  if (confirmed) {
    return (
      <div data-page style={{ textAlign: 'center', maxWidth: '30rem', margin: '0 auto', padding: 'var(--space-10) 0' }}>
        <Icons.CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }} />
        <h1 data-page-title style={{ marginBottom: 'var(--space-2)' }}>Booking confirmed</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          We&apos;ve emailed you a confirmation for your stay at {p['name'] as string}.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button type="button" data-btn-secondary onClick={() => router.push('/bookings')}>View my bookings</button>
          <button type="button" data-btn-primary onClick={() => router.push('/accommodation')}>Back to search</button>
        </div>
      </div>
    );
  }

  return (
    <div data-page style={{ maxWidth: '32rem' }}>
      <button type="button" data-back-link
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}
        onClick={() => router.push(`/accommodation/${slug}`)}>
        <Icons.ChevronLeft size={16} /> Back to property
      </button>

      <h1 data-page-title>Book {room['name'] as string}</h1>
      <p data-page-subtitle>{p['name'] as string} · {p['city'] as string}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
        {formError && <div data-form-error role="alert">{formError}</div>}

        <div data-form-grid-2>
          <div data-form-group>
            <label htmlFor="ci">Check-in *</label>
            <input id="ci" type="date" required value={checkIn} min={today}
              onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div data-form-group>
            <label htmlFor="co">Check-out *</label>
            <input id="co" type="date" required value={checkOut} min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        </div>

        <div data-form-grid-2>
          <div data-form-group>
            <label htmlFor="adults">Adults</label>
            <input id="adults" type="number" min={1} max={maxGuests} value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} />
          </div>
          <div data-form-group>
            <label htmlFor="children">Children</label>
            <input id="children" type="number" min={0} value={children}
              onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} />
          </div>
        </div>

        <div data-form-group>
          <label htmlFor="requests">Special requests</label>
          <textarea id="requests" rows={3} value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)} />
        </div>

        {typeof rate === 'number' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--color-bg-sunk)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <span>R{rate.toLocaleString()} × {nights || 0} night{nights !== 1 ? 's' : ''}</span>
            <strong>{total !== null ? `R${total.toLocaleString()}` : '—'}</strong>
          </div>
        )}

        <label data-checkbox-label>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I accept the terms and conditions, and {CONSENT_TEXT.charAt(0).toLowerCase() + CONSENT_TEXT.slice(1)}</span>
        </label>

        <button type="submit" data-btn-primary data-btn-full disabled={bookMutation.isPending}>
          {bookMutation.isPending ? 'Booking…' : 'Confirm booking'}
        </button>
      </form>
    </div>
  );
}
