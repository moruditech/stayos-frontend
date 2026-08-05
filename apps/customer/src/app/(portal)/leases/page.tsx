'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge } from '@stayos/ui';
import { leaseKeys } from '@/lib/query-keys';

export default function LeasesPage(): React.ReactElement {
  const session = useSession();
  const { data: leases, isLoading } = useQuery({
    queryKey: leaseKeys.list(),
    queryFn:  () => api.customer.listLeases(),
    enabled:  !!session,
  });
  const all = (leases as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div data-page>
      <h1 data-page-title>Leases</h1>
      <p data-page-subtitle>Your student accommodation lease agreements</p>

      {isLoading ? <SkeletonLoader rows={3} /> : all.length === 0 ? (
        <EmptyState title="No leases" description="Your lease agreements will appear here once issued." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {all.map((lease) => {
            const l = lease as Record<string, unknown>;
            const start = new Date(l['startDate'] as string);
            const end   = new Date(l['endDate'] as string);
            const isSigned = l['status'] === 'signed';
            return (
              <a key={l['_id'] as string} href={`/leases/${l['_id'] as string}`}
                data-card-padded style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                    {l['propertyName'] as string} — Lease agreement
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    {start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' – '}
                    {end.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {!isSigned && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', fontWeight: 'var(--font-semibold)', marginTop: '4px' }}>
                      ✍ Signature required
                    </div>
                  )}
                </div>
                <StatusBadge status={l['status'] as string} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
