'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { ConsentGate, InlineError, applyServerErrors, SkeletonLoader } from '@stayos/ui';
import { publicBookingSchema } from '@stayos/validators';
import type { PublicBookingInput } from '@stayos/validators';
import { accommodationKeys, bookingKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';

interface Props { params: { slug: string } }

export default function BookingFormPage({ params }: Props): React.ReactElement {
  const session      = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const qc           = useQueryClient();

  const [consented, setConsented] = useState(false);
  const [formError, setFormError] = useState('');

  const roomId   = searchParams.get('room') ?? '';
  const checkIn  = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';

  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: accommodationKeys.detail(params.slug),
    queryFn:  () => api.discovery.getProperty(params.slug),
  });

  const { data: availability } = useQuery({
    queryKey: accommodationKeys.availability(params.slug, { checkIn, checkOut }),
    queryFn:  () => api.discovery.getPropertyAvailability(params.slug, { checkIn, checkOut }),
    enabled:  !!(checkIn && checkOut),
  });

  const form = useForm<PublicBookingInput>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      roomId:    roomId,
      checkIn:   checkIn,
      checkOut:  checkOut,
      adults:    1,
      children:  0,
      consentSnapshot: {
        acknowledged: false,
        text: '',
        fieldsDisclosed: ['name', 'email', 'phone', 'idNumber'],
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: PublicBookingInput) => api.bookings.createPublic(input),
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: bookingKeys.list() });
      const b = booking;
      router.push(`/bookings/${b._id}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
      } else {
        setFormError(err.message ?? 'Booking failed. Please try again.');
      }
    },
  });

  if (!session) {
    router.replace(`/login?redirect=/accommodation/${params.slug}/book`);
    return <></>;
  }

  if (propLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const p = property as Record<string, unknown> | undefined;
  if (!p) return <div data-page><p>Property not found.</p></div>;

  const nights = (checkIn && checkOut)
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const rate = (availability as Record<string, unknown>)?.['ratePerNight'] as number
    ?? (p['baseRate'] as number ?? 0);

  const subtotal = rate * nights;
  const tax      = Math.round(subtotal * 0.15); // 15% VAT — displayed only; backend calculates authoritatively
  const total    = subtotal + tax;

  const consentText = `By completing this booking, you agree to share your personal information including name, email, phone number and identification details with ${p['name'] as string} for the purpose of processing your accommodation booking. This data will be handled in accordance with POPIA and our Privacy Policy.`;

  async function handleSubmit(values: PublicBookingInput): Promise<void> {
    if (!consented) {
      setFormError('You must accept the data sharing consent to proceed.');
      return;
    }
    setFormError('');
    const payload: PublicBookingInput = {
      ...values,
      consentSnapshot: {
        acknowledged: true,
        text: consentText,
        fieldsDisclosed: ['name', 'email', 'phone', 'idNumber'],
      },
    };
    createMutation.mutate(payload);
  }

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        ← Back
      </button>

      <h1 data-page-title>Complete your booking</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>

        {/* Booking summary */}
        <div data-card-padded>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-muted)', overflow: 'hidden', flexShrink: 0 }}>
              <img src={`/images/properties/${params.slug}-thumb.jpg`} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div>
              <div style={{ fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-1)' }}>{p['name'] as string}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                📍 {p['city'] as string}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Check-in</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                {checkIn ? new Date(checkIn).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Check-out</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                {checkOut ? new Date(checkOut).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <span>R{rate.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}</span>
              <span>R{subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <span>Taxes &amp; fees (indicative)</span>
              <span>R{tax.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
              <span>Total</span>
              <span>R{total.toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              Final amount calculated by the property at checkout.
            </p>
          </div>
        </div>

        {/* Booking form */}
        <form onSubmit={form.handleSubmit((v) => void handleSubmit(v))} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Guest count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div data-form-group>
                <label htmlFor="adults">Adults</label>
                <select id="adults" {...form.register('adults', { valueAsNumber: true })}>
                  {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <InlineError message={form.formState.errors.adults?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="children">Children</label>
                <select id="children" {...form.register('children', { valueAsNumber: true })}>
                  {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Special requests */}
            <div data-form-group>
              <label htmlFor="specialRequests">Special requests (optional)</label>
              <textarea id="specialRequests" rows={3} placeholder="Early check-in, dietary requirements, accessibility needs…"
                {...form.register('specialRequests')} />
            </div>

            {/* Promotion code */}
            <div data-form-group>
              <label htmlFor="promotionId">Promotion code (optional)</label>
              <input id="promotionId" type="text" placeholder="Enter code" {...form.register('promotionId')} />
            </div>

            {/* Data-sharing consent — never pre-checked (TAD 07 §3) */}
            <ConsentGate
              legalText={
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>
                    Data sharing consent
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                    {consentText}
                  </p>
                </div>
              }
              onConsent={setConsented}
            />

            {formError && <span role="alert" data-form-error>{formError}</span>}

            <button
              type="submit"
              disabled={createMutation.isPending || !consented}
              data-btn-primary
              data-btn-full
            >
              {createMutation.isPending ? 'Confirming booking…' : 'Confirm booking'}
            </button>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              By confirming, you agree to the property&apos;s cancellation policy and our{' '}
              <a href="/legal/terms" data-link>Terms of Service</a>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
