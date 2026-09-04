'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, Icons, type LucideIcon } from '@stayos/ui';
import { bookingKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

const GATEWAYS: { id: string; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: 'payfast',    label: 'PayFast',        icon: Icons.CreditCard, blurb: 'Card, Instant EFT, and more' },
  { id: 'ozow',       label: 'Ozow',           icon: Icons.Landmark,   blurb: 'Instant EFT from your bank' },
  { id: 'manual_eft', label: 'Bank transfer',  icon: Icons.Building2, blurb: 'Pay via EFT, confirmed manually' },
];

export default function PayBalancePage({ params }: Props): React.ReactElement {
  const session   = useSession();
  const { toast } = useToast();
  const [gateway, setGateway] = useState<string>('payfast');
  const [submitting, setSubmitting] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: bookingKeys.detail(params.id),
    queryFn:  () => api.customer.getBooking(params.id),
    enabled:  !!session,
  });

  const initiateMutation = useMutation({
    mutationFn: (gw: string) =>
      api.customer.initiateBookingPayment(params.id, {
        type: 'balance', gateway: gw, amount: outstanding, currency: 'ZAR',
      }),
    onSuccess: (result) => {
      const url = (result as Record<string, unknown>)['paymentUrl'] as string | undefined;
      if (url) {
        window.location.href = url;
      } else {
        toast('Payment initiated — check your payment method to complete it.', 'info');
        setSubmitting(false);
      }
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Could not start payment. Please try again.', 'error');
      setSubmitting(false);
    },
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={4} /></div>;

  const b = booking as Record<string, unknown> | undefined;
  if (!b) return <div data-page><p>Booking not found.</p></div>;

  const tenant      = (typeof b['tenantId'] === 'object' && b['tenantId'] !== null ? b['tenantId'] : {}) as Record<string, unknown>;
  const propertyName = (tenant['name'] as string) ?? 'Property';
  const totalAmount  = (b['totalAmount'] as number) ?? 0;
  const depositPaid  = b['depositPaid'] === true;
  const paidAmount   = (b['paidAmount'] as number) ?? (depositPaid ? (b['depositAmount'] as number) ?? 0 : 0);
  const outstanding  = Math.max(0, totalAmount - paidAmount);

  return (
    <div data-page>
      <Link href={`/bookings/${params.id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <Icons.ChevronLeft size={16} /> Back to booking
      </Link>
      <h1 data-page-title>Pay balance</h1>
      <p data-page-subtitle>{propertyName} — Booking #{(b['confirmationNumber'] as string) ?? '—'}</p>

      <div data-card-padded style={{ marginBottom: 'var(--space-5)', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Amount due</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)' }}>
          R{outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {totalAmount > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            of R{totalAmount.toLocaleString()} total{paidAmount > 0 ? ` · R${paidAmount.toLocaleString()} already paid` : ''}
          </div>
        )}
      </div>

      {outstanding <= 0 ? (
        <div data-card-padded style={{ textAlign: 'center' }}>
          <Icons.CheckCircle2 size={32} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-2)' }} />
          <p>This booking is already fully paid.</p>
          <Link href={`/bookings/${params.id}`} data-btn-secondary style={{ marginTop: 'var(--space-3)', display: 'inline-block' }}>
            Back to booking
          </Link>
        </div>
      ) : (
        <>
          <div data-section-header><span data-section-title>Choose a payment method</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            {GATEWAYS.map((gw) => {
              const Icon = gw.icon;
              return (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => setGateway(gw.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${gateway === gw.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: gateway === gw.id ? 'var(--color-primary-tint)' : 'var(--color-surface)',
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                  }}
                >
                  <Icon size={22} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{gw.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{gw.blurb}</div>
                  </div>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: `2px solid ${gateway === gw.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: gateway === gw.id ? 'var(--color-primary)' : 'transparent',
                  }} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-btn-primary
            data-btn-full
            disabled={submitting || initiateMutation.isPending}
            onClick={() => { setSubmitting(true); initiateMutation.mutate(gateway); }}
          >
            {submitting || initiateMutation.isPending
              ? 'Redirecting…'
              : `Pay R${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} now`}
          </button>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
            You'll be redirected to complete payment securely.
          </p>
        </>
      )}
    </div>
  );
}
