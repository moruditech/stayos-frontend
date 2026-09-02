'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@stayos/ui';

export default function PaymentMethodsPage(): React.ReactElement {
  const router = useRouter();

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to payments
      </button>

      <h1 data-page-title>Saved payment methods</h1>
      <p data-page-subtitle>Manage the cards and accounts used for your payments</p>

      <div data-card-padded style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          <Icons.Wallet size={40} />
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
          Coming soon
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '28rem', margin: '0 auto' }}>
          Adding, editing and removing saved cards isn&apos;t available yet. In the meantime, you can pay any due amount directly from your bookings or payment history.
        </p>
      </div>
    </div>
  );
}
