'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge, CopyButton } from '@stayos/ui';
import { paymentKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

export default function PaymentDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();
  const router  = useRouter();

  const { data: payment, isLoading } = useQuery({
    queryKey: paymentKeys.detail(params.id),
    queryFn:  () => api.payments.get(params.id),
    enabled:  !!session,
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={4} /></div>;
  const p = payment as Record<string, unknown> | undefined;
  if (!p) return <div data-page><p>Payment not found.</p></div>;

  const status = p['status'] as string;
  const date   = new Date(p['createdAt'] as string).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        ← Back to payments
      </button>
      <h1 data-page-title>Payment details</h1>

      <div data-card-padded style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: status === 'refunded' ? 'var(--color-success)' : status === 'due' ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
              {status === 'refunded' ? '−' : ''}R{((p['amount'] as number) ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>{date}</div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[
            { label: 'Description',    value: (p['description'] as string) ?? '—' },
            { label: 'Reference',      value: (p['reference'] as string) ?? '—', copy: true },
            { label: 'Payment method', value: (p['paymentMethod'] as string) ?? '—' },
            p['bookingId'] ? { label: 'Booking', value: `#${p['confirmationNumber'] as string ?? p['bookingId'] as string}`, link: `/bookings/${p['bookingId'] as string}` } : null,
          ].filter(Boolean).map((row) => row && (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {row.link ? (
                  <a href={row.link} data-link style={{ fontSize: 'var(--text-sm)' }}>{row.value}</a>
                ) : (
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{row.value}</span>
                )}
                {row.copy && <CopyButton value={row.value} label="Copy" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {status === 'due' && (
        <a href={`/bookings/${p['bookingId'] as string}/pay-balance`} data-btn-primary data-btn-full style={{ marginBottom: 'var(--space-4)' }}>
          Pay now — R{((p['amount'] as number) ?? 0).toLocaleString()}
        </a>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <a href={`/api/v1/payments/${params.id}/receipt`} target="_blank" rel="noopener noreferrer" data-btn-ghost style={{ flex: 1 }}>
          🧾 Download receipt
        </a>
        <a href="/support" data-btn-ghost style={{ flex: 1 }}>💬 Query payment</a>
      </div>
    </div>
  );
}
