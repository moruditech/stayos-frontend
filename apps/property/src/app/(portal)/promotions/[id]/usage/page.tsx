'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, ReadOnlyField, Icons } from '@stayos/ui';
import { promotionKeys } from '@/lib/query-keys';

function fmtZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PromotionUsagePage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: usage, isLoading } = useQuery({
    queryKey: promotionKeys.usage(id),
    queryFn: () => api.promotions.getUsage(id),
  });

  return (
    <div data-page="promotion-usage">
      <div data-page-header>
        <div>
          <Link href="/promotions" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Promotions</Link>
          <h1>{isLoading ? 'Loading…' : `Usage — ${usage?.code ?? '—'}`}</h1>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : !usage ? (
        <p>Promotion not found.</p>
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField
              label="Times used"
              value={usage.maxUses ? `${usage.usedCount} / ${usage.maxUses}` : String(usage.usedCount)}
            />
            <ReadOnlyField label="Max uses per guest" value={String(usage.maxUsesPerCustomer)} />
            <ReadOnlyField label="Total discount given" value={fmtZAR(usage.totalDiscountGiven)} />
          </div>

          {!usage.bookings.length ? (
            <EmptyState
              title="No bookings yet"
              description="Bookings made with this promo code will appear here."
            />
          ) : (
            <table data-table>
              <thead>
                <tr>
                  <th>Confirmation #</th>
                  <th>Guest</th>
                  <th>Total</th>
                  <th>Discount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {usage.bookings.map((b) => (
                  <tr key={b._id}>
                    <td><code data-promo-code>{b.confirmationNumber}</code></td>
                    <td>{b.customerId ? `${b.customerId.firstName} ${b.customerId.lastName}` : '—'}</td>
                    <td>{fmtZAR(b.totalAmount)}</td>
                    <td>{fmtZAR(b.discountAmount)}</td>
                    <td>{fmtDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
