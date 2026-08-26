'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, Icons, type LucideIcon } from '@stayos/ui';
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
          <Link href="/invoices" data-btn-ghost style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)' }}>
            <Icons.FileText size={14} /> View statements <Icons.ChevronRight size={14} />
          </Link>
        </div>
        <div data-payment-stats>
          <div data-payment-stat>
            <div data-payment-stat-label>Booking balance <Icons.Info size={12} style={{ display: "inline", verticalAlign: "-1px" }} /></div>
            <div data-payment-stat-value data-overdue={balance > 0 ? '' : undefined}>
              R{balance.toLocaleString()}
            </div>
            <div data-payment-stat-sub>{dueCount} due payment{dueCount !== 1 ? 's' : ''}</div>
            {balance > 0 && (
              <button type="button" data-payment-stat-action data-danger>Pay now</button>
            )}
          </div>
          <div data-payment-stat>
            <div data-payment-stat-label>Paid this year <Icons.Info size={12} style={{ display: "inline", verticalAlign: "-1px" }} /></div>
            <div data-payment-stat-value>R{paidYear.toLocaleString()}</div>
            <div data-payment-stat-sub>{paidCount} payment{paidCount !== 1 ? 's' : ''}</div>
            <button type="button" data-payment-stat-action>View history</button>
          </div>
          <div data-payment-stat>
            <div data-payment-stat-label>Refunds <Icons.Info size={12} style={{ display: "inline", verticalAlign: "-1px" }} /></div>
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
          { label: 'Make a payment',    icon: Icons.CreditCard, tint: 'success', path: '/payments/new' },
          { label: 'View invoices',     icon: Icons.FileText,   tint: 'warning', path: '/invoices' },
          { label: 'Payment history',   icon: Icons.RefreshCcw, tint: 'sand',  path: '/payments' },
          { label: 'Saved cards',       icon: Icons.Wallet,     tint: 'info',    path: '/payments/methods' },
        ].map((a) => (
          <Link key={a.label} href={a.path} data-quick-action>
            <span data-quick-action-icon data-tint={a.tint} aria-hidden="true"><a.icon size={20} /></span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent transactions */}
      <div data-section-header>
        <span data-section-title>Recent transactions</span>
        <Link href="/payments/all" data-section-link>View all →</Link>
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
        <Link href="/payments/methods" data-section-link>Manage →</Link>
      </div>
      <div data-card-padded>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <PaymentMethodPlaceholder icon={Icons.CreditCard} name="Mastercard ···· 4242" sub="Expires 12/27" isDefault />
          <PaymentMethodPlaceholder icon={Icons.CreditCard} name="Visa ···· 8431" sub="Expires 09/26" />
          <PaymentMethodPlaceholder icon={Icons.Landmark} name="FNB Checking Account" sub="···· 6789" />
        </div>
        <button type="button" data-btn-ghost data-btn-full
          style={{ marginTop: 'var(--space-4)', justifyContent: 'flex-start', gap: 'var(--space-3)' }}>
          <Icons.Plus size={16} aria-hidden="true" /> Add payment method
        </button>
      </div>

      {/* Support callout */}
      <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true"><Icons.Headphones size={20} /></span>
          <div>
            <strong>Need help with a payment?</strong>
            <p>Our support team is here to help you with any payment related issues.</p>
          </div>
        </div>
        <Link href="/support" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Contact support <Icons.ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

const STATUS_ICON_MAP: Record<string, LucideIcon> = { paid: Icons.Building2, refunded: Icons.RefreshCcw, due: Icons.FileText };
const STATUS_TINT_MAP: Record<string, { bg: string; fg: string }> = {
  paid:     { bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
  refunded: { bg: 'var(--color-info-bg)',       fg: 'var(--color-info)' },
  due:      { bg: 'var(--color-sand-bg)',       fg: 'var(--color-text-secondary)' },
};

function TransactionItem({ payment: p }: { payment: Record<string, unknown> }): React.ReactElement {
  const status = p['status'] as string;
  const date   = new Date(p['createdAt'] as string).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  const StatusIcon = STATUS_ICON_MAP[status] ?? Icons.CreditCard;
  const tint = STATUS_TINT_MAP[status] ?? { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-secondary)' };
  return (
    <Link href={`/payments/${p['_id'] as string}`} data-transaction-item style={{ textDecoration: 'none' }}>
      <span data-transaction-icon style={{ background: tint.bg, color: tint.fg }}>
        <StatusIcon size={16} />
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
      <Icons.ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
    </Link>
  );
}

function PaymentMethodPlaceholder({ icon: Icon, name, sub, isDefault }: {
  icon: LucideIcon; name: string; sub: string; isDefault?: boolean;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <span style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}><Icon size={22} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>
      </div>
      {isDefault && (
        <span data-status-badge data-status="confirmed" style={{ fontSize: 'var(--text-xs)' }}>Default</span>
      )}
      <button type="button" style={{ color: 'var(--color-text-muted)', display: 'flex' }} aria-label="More options"><Icons.MoreHorizontal size={18} /></button>
    </div>
  );
}
