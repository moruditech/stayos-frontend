'use client';
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge, DownloadButton, useToast, Icons } from '@stayos/ui';

interface Props { params: { id: string } }

export default function InvoiceDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();
  const router  = useRouter();
  const { toast } = useToast();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', params.id],
    queryFn:  () => api.university.getInvoice(params.id),
    enabled:  !!session,
  });

  const payMutation = useMutation({
    mutationFn: () => api.university.payInvoice(params.id, {}),
    onSuccess: (result) => {
      const r = result as Record<string, unknown>;
      if (r['redirectUrl']) window.location.href = r['redirectUrl'] as string;
    },
    onError: (err: ApiError) => toast(err.message ?? 'Payment failed.', 'error'),
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;
  const inv = invoice as Record<string, unknown> | undefined;
  if (!inv) return <div data-page><p>Invoice not found.</p></div>;

  const status   = inv['status'] as string;
  const lineItems= (inv['lineItems'] as Record<string, unknown>[]) ?? [];
  const pdfUrl   = `/api/v1/university/invoices/${params.id}/pdf`;

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to invoices
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 data-page-title style={{ marginBottom: 'var(--space-1)' }}>Invoice #{inv['invoiceNumber'] as string}</h1>
          <p data-page-subtitle>Issued {new Date(inv['issueDate'] as string).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div data-card-padded style={{ marginBottom: 'var(--space-5)' }}>
        <h3 style={{ fontWeight: '700', fontSize: '14.5px', marginBottom: 'var(--space-4)' }}>Line items</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {lineItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontWeight: '500' }}>{item['description'] as string}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{(item['category'] as string)?.replace(/_/g, ' ')}</div>
              </div>
              <span style={{ fontWeight: '600' }}>R{((item['amount'] as number) ?? 0).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: '700', paddingTop: 'var(--space-2)' }}>
            <span>Total</span>
            <span>R{((inv['totalAmount'] as number) ?? 0).toLocaleString()}</span>
          </div>
          {(inv['paidAmount'] as number) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-success)' }}>
              <span>Amount paid</span>
              <span>−R{(inv['paidAmount'] as number).toLocaleString()}</span>
            </div>
          )}
          {(inv['balanceDue'] as number) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: '700', color: 'var(--color-danger)' }}>
              <span>Balance due</span>
              <span>R{(inv['balanceDue'] as number).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {['issued', 'partially_paid', 'overdue'].includes(status) && (
        <button type="button" data-btn-primary data-btn-full style={{ marginBottom: 'var(--space-3)' }}
          disabled={payMutation.isPending} onClick={() => payMutation.mutate()}>
          {payMutation.isPending ? 'Redirecting to payment…' : `Pay R${((inv['balanceDue'] as number) ?? 0).toLocaleString()}`}
        </button>
      )}
      <DownloadButton href={pdfUrl} filename={`invoice-${inv['invoiceNumber'] as string}.pdf`} label="Download PDF" />
    </div>
  );
}
