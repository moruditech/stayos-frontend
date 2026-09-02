'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons, type LucideIcon } from '@stayos/ui';
import { paymentKeys } from '@/lib/query-keys';

const STATUS_ICON_MAP: Record<string, LucideIcon> = { paid: Icons.Building2, refunded: Icons.RefreshCcw, due: Icons.FileText };
const STATUS_TINT_MAP: Record<string, { bg: string; fg: string }> = {
  paid:     { bg: 'var(--color-primary-tint)', fg: 'var(--color-primary)' },
  refunded: { bg: 'var(--color-info-bg)',       fg: 'var(--color-info)' },
  due:      { bg: 'var(--color-bg-sunk)',       fg: 'var(--color-text-secondary)' },
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'due',      label: 'Due' },
  { id: 'paid',     label: 'Paid' },
  { id: 'refunded', label: 'Refunded' },
];

export default function AllPaymentsPage(): React.ReactElement {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get('status') ?? 'all';

  const { data: payments, isLoading } = useQuery({
    queryKey: paymentKeys.list(),
    queryFn:  () => api.customer.listPayments(),
    enabled:  !!session,
  });

  const all = (payments as Record<string, unknown>[] | undefined) ?? [];
  const filtered = activeFilter === 'all' ? all : all.filter((p) => p['status'] === activeFilter);

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to payments
      </button>

      <h1 data-page-title>Payment history</h1>
      <p data-page-subtitle>All your payments, invoices and refunds</p>

      <div data-filter-bar style={{ marginBottom: 'var(--space-5)' }}>
        {FILTERS.map((f) => (
          <Link key={f.id} href={f.id === 'all' ? '/payments/all' : `/payments/all?status=${f.id}`}
            data-filter-chip data-active={activeFilter === f.id ? '' : undefined}>
            {f.label}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No payments found" description="Nothing to show for this filter yet." />
      ) : (
        <div data-card-padded style={{ padding: '0 var(--space-6)' }}>
          {filtered.map((p) => <TransactionRow key={p['_id'] as string} payment={p} />)}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ payment: p }: { payment: Record<string, unknown> }): React.ReactElement {
  const status = p['status'] as string;
  const date   = new Date(p['createdAt'] as string).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  const StatusIcon = STATUS_ICON_MAP[status] ?? Icons.CreditCard;
  const tint = STATUS_TINT_MAP[status] ?? { bg: 'var(--color-bg-sunk)', fg: 'var(--color-text-secondary)' };
  return (
    <Link href={`/payments/${p['_id'] as string}`} data-transaction-item style={{ textDecoration: 'none' }}>
      <span data-transaction-icon style={{ background: tint.bg, color: tint.fg }}>
        <StatusIcon size={16} />
      </span>
      <div data-transaction-info>
        <div data-transaction-name>{(p['description'] as string) ?? 'Payment'}</div>
        <div data-transaction-meta>
          {(p['referenceNumber'] as string) ?? '—'} · {date}
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
