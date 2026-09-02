'use client';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, Icons } from '@stayos/ui';
import { invoiceKeys } from '@/lib/query-keys';

export default function InvoicesPage(): React.ReactElement {
  const session = useSession();
  const router = useRouter();
  const { data: invoices, isLoading } = useQuery({
    queryKey: invoiceKeys.list(),
    queryFn:  () => api.customer.listInvoices(),
    enabled:  !!session,
  });

  const all = (invoices as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back
      </button>
      <h1 data-page-title>Invoices</h1>
      <p data-page-subtitle>Your student billing statements</p>

      {isLoading ? <SkeletonLoader rows={4} /> : all.length === 0 ? (
        <EmptyState title="No invoices" description="Your student invoices will appear here once issued." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {all.map((inv) => {
            const inv_ = inv as Record<string, unknown>;
            const issueDate = new Date(inv_['issueDate'] as string);
            const dueDate   = inv_['dueDate'] ? new Date(inv_['dueDate'] as string) : null;
            const isOverdue = dueDate && dueDate < new Date() && inv_['status'] !== 'paid';
            return (
              <Link key={inv_['_id'] as string} href={`/invoices/${inv_['_id'] as string}`}
                data-card-padded style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: 'var(--space-1)' }}>
                    Invoice #{inv_['invoiceNumber'] as string ?? inv_['_id'] as string}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Issued {issueDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {dueDate && ` · Due ${dueDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                  {isOverdue && <div style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: '600', marginTop: '4px' }}>Overdue</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '700', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text)' }}>
                    R{((inv_['totalAmount'] as number) ?? 0).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 'var(--space-1)' }}><StatusBadge status={inv_['status'] as string} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
