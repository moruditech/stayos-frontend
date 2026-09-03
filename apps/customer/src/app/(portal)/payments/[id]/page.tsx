'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge, CopyButton, Icons } from '@stayos/ui';
import { paymentKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

const GATEWAY_LABELS: Record<string, string> = {
  payfast:    'PayFast',
  ozow:       'Ozow',
  stripe:     'Card (Stripe)',
  snapscan:   'SnapScan',
  zapper:     'Zapper',
  manual_eft: 'Bank Transfer (EFT)',
  cash:       'Cash',
};

export default function PaymentDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();
  const router  = useRouter();

  const { data: payment, isLoading } = useQuery({
    queryKey: paymentKeys.detail(params.id),
    queryFn:  () => api.customer.getPayment(params.id),
    enabled:  !!session,
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={4} /></div>;
  const p = payment as Record<string, unknown> | undefined;
  if (!p) return <div data-page><p>Payment not found.</p></div>;

  const status = p['status'] as string;
  const date   = new Date(p['createdAt'] as string).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // bookingId can come back either as a plain ID string or as a populated
  // object (e.g. { _id, confirmationNumber, ... }) depending on the endpoint.
  // Handle both rather than assuming — interpolating the raw object into a
  // template literal is what previously rendered literally as "[object Object]".
  const bookingRaw = p['bookingId'];
  const bookingObj = (typeof bookingRaw === 'object' && bookingRaw !== null) ? bookingRaw as Record<string, unknown> : null;
  const bookingId  = bookingObj ? (bookingObj['_id'] as string) : (bookingRaw as string | undefined);
  const bookingConfirmation = (p['confirmationNumber'] as string) ?? (bookingObj?.['confirmationNumber'] as string) ?? bookingId;

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to payments
      </button>
      <h1 data-page-title>Payment details</h1>

      <div data-card-padded style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: status === 'refunded' ? 'var(--color-success)' : status === 'due' ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {status === 'refunded' ? '−' : ''}R{((p['amount'] as number) ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>{date}</div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[
            { label: 'Description',    value: (p['description'] as string) ?? (p['note'] as string) ?? '—' },
            { label: 'Reference',      value: (p['referenceNumber'] as string) ?? '—', copy: true },
            { label: 'Payment method', value: GATEWAY_LABELS[p['gateway'] as string] ?? (p['gateway'] as string) ?? '—' },
            bookingId ? { label: 'Booking', value: `#${bookingConfirmation}`, link: `/bookings/${bookingId}` } : null,
          ].filter(Boolean).map((row) => row && (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {row.link ? (
                  <Link href={row.link} data-link style={{ fontSize: '13px' }}>{row.value}</Link>
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{row.value}</span>
                )}
                {row.copy && <CopyButton value={row.value} label="Copy" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {status === 'due' && bookingId && (
        <Link href={`/bookings/${bookingId}/pay-balance`} data-btn-primary data-btn-full style={{ marginBottom: 'var(--space-4)' }}>
          Pay now — R{((p['amount'] as number) ?? 0).toLocaleString()}
        </Link>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <a href={`/api/v1/payments/${params.id}/receipt`} target="_blank" rel="noopener noreferrer" data-btn-ghost style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
          <Icons.FileText size={16} /> Download receipt
        </a>
        <Link href="/support" data-btn-ghost style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
          <Icons.MessageCircle size={16} /> Query payment
        </Link>
      </div>
    </div>
  );
}
