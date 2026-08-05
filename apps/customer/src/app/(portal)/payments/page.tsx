'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader } from '@stayos/ui';
import { paymentKeys } from '@/lib/query-keys';

export default function PaymentsPage(): React.ReactElement {
  const session = useSession();

  const { data: payments, isLoading } = useQuery({
    queryKey: paymentKeys.list(),
    queryFn:  () => api.customer.listPayments(),
    enabled:  !!session,
  });

  const all = (payments as Record<string, unknown>[] | undefined) ?? [];

  // Summary stats derived from payment list
  const balance    = all.filter((p) => p['status'] === 'due').reduce((s, p) => s + ((p['amount'] as number) ?? 0), 0);
  const paidYear   = all.filter((p) => p['status'] === 'paid').reduce((s, p) => s + ((p['amount'] as number) ?? 0), 0);
  const refunded   = all.filter((p) => p['status'] === 'refunded').reduce((s, p) => s + ((p['amount'] as number) ?? 0), 0);
  const dueCount   = all.filter((p) => p['status'] === 'due').length;
  const paidCount  = all.filter((p) => p['status'] === 'paid').length;
  const refCount   = all.filter((p) => p['status'] === 'refunded').length;

  return (
    <div data-page>
      <h1 data-page-title>Payments</h1>
      <p data-page-subtitle>Manage your payments and transactions</p>

      {/* Payment overview card */}
      <div data-payment-overview>
        <div data-payment-overview-header>
          <div>
            <h2>Payment overview</h2>
            <p>Your account summary</p>
          </div>
          <a href="/invoices" data-section-link>📄 View statements →</a>
        </div>
        <div data-payment-stats>
          <div data-payment-stat>
            <div data-payment-stat-label>Booking balance ℹ</div>
            <div data-payment-stat-value data-overdue={balance > 0 ? '' : undefined}>
              R{balance.toLocaleString()}
            </div>
            <div data-payment-stat-sub>{dueCount} due payment{dueCount !== 1 ? 's' : ''}</div>
            {balance > 0 && (
              <button type="button" data-payment-stat-action data-danger>Pay now</button>
            )}
          </div>
          <div data-payment-stat>
            <div data-payment-stat-label>Paid this year ℹ</div>
            <div data-payment-stat-value>R{paidYear.toLocaleString()}</div>
            <div data-payment-stat-sub>{paidCount} payment{paidCount !== 1 ? 's' : ''}</div>
            <button type="button" data-payment-stat-action>View history</button>
          </div>
          <div data-payment-stat>
            <div data-payment-stat-label>Refunds ℹ</div>
            <div data-payment-stat-value data-positive={refunded > 0 ? '' : undefined}>
              R{refunded.toLocaleString()}
            </div>
            <div data-payment-stat-sub>{refCount} refund{refCount !== 1 ? 's' : ''}</div>
            <button type="button" data-payment-stat-action>View refunds</button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div data-section-header>
        <span data-section-title>Quick actions</span>
      </div>
      <div data-quick-actions>
        {[
          { label: 'Make a payment',    icon: '💳', path: '/payments/new' },
          { label: 'View invoices',     icon: '🧾', path: '/invoices' },
          { label: 'Payment history',   icon: '🔄', path: '/payments' },
          { label: 'Saved cards',       icon: '🪪', path: '/payments/methods' },
        ].map((a) => (
          <a key={a.label} href={a.path} data-quick-action>
            <span data-quick-action-icon aria-hidden="true">{a.icon}</span>
            <span>{a.label}</span>
          </a>
        ))}
      </div>

      {/* Recent transactions */}
      <div data-section-header>
        <span data-section-title>Recent transactions</span>
        <a href="/payments/all" data-section-link>View all →</a>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : (
        <div data-card-padded style={{ padding: '0 var(--space-6)' }}>
          {all.length === 0 ? (
            <p style={{ padding: 'var(--space-6) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              No transactions yet.
            </p>
          ) : all.slice(0, 8).map((p) => <TransactionItem key={p['_id'] as string} payment={p} />)}
        </div>
      )}

      {/* Saved payment methods */}
      <div data-section-header style={{ marginTop: 'var(--space-6)' }}>
        <span data-section-title>Saved payment methods</span>
        <a href="/payments/methods" data-section-link>Manage →</a>
      </div>
      <div data-card-padded>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <PaymentMethodPlaceholder icon="💳" name="Mastercard ···· 4242" sub="Expires 12/27" isDefault />
          <PaymentMethodPlaceholder icon="💳" name="Visa ···· 8431" sub="Expires 09/26" />
          <PaymentMethodPlaceholder icon="🏦" name="FNB Checking Account" sub="···· 6789" />
        </div>
        <button type="button" data-btn-ghost data-btn-full
          style={{ marginTop: 'var(--space-4)', justifyContent: 'flex-start', gap: 'var(--space-3)' }}>
          <span aria-hidden="true">➕</span> Add payment method
        </button>
      </div>

      {/* Support callout */}
      <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true">🎧</span>
          <div>
            <strong>Need help with a payment?</strong>
            <p>Our support team is here to help you with any payment related issues.</p>
          </div>
        </div>
        <a href="/support" data-btn-secondary>Contact support →</a>
      </div>
    </div>
  );
}

const ICONS: Record<string, string> = { paid: '🏢', refunded: '🔄', due: '🧾' };

function TransactionItem({ payment: p }: { payment: Record<string, unknown> }): React.ReactElement {
  const status = p['status'] as string;
  const date   = new Date(p['createdAt'] as string).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <a href={`/payments/${p['_id'] as string}`} data-transaction-item style={{ textDecoration: 'none' }}>
      <span data-transaction-icon style={{ background: status === 'refunded' ? 'var(--color-success-bg)' : 'var(--color-surface-muted)' }}>
        {ICONS[status] ?? '💳'}
      </span>
      <div data-transaction-info>
        <div data-transaction-name>{(p['description'] as string) ?? 'Payment'}</div>
        <div data-transaction-meta>
          {(p['reference'] as string) ?? '—'} · {date}
        </div>
      </div>
      <div data-transaction-amount>
        <div data-transaction-amount-value
          data-paid={status === 'paid' ? '' : undefined}
          data-due={status === 'due' ? '' : undefined}
          data-refunded={status === 'refunded' ? '' : undefined}>
          R{((p['amount'] as number) ?? 0).toLocaleString()}
        </div>
        <div data-transaction-amount-status>
          {status === 'due'
            ? `Due on ${new Date(p['dueDate'] as string).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
      <span aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>›</span>
    </a>
  );
}

function PaymentMethodPlaceholder({ icon, name, sub, isDefault }: {
  icon: string; name: string; sub: string; isDefault?: boolean;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <span style={{ fontSize: 'var(--text-2xl)', width: '40px', textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>
      </div>
      {isDefault && (
        <span data-status-badge data-status="confirmed" style={{ fontSize: 'var(--text-xs)' }}>Default</span>
      )}
      <button type="button" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-lg)' }}>⋯</button>
    </div>
  );
}
