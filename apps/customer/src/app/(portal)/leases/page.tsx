'use client';
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, Icons } from '@stayos/ui';
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
              <Link key={l['_id'] as string} href={`/leases/${l['_id'] as string}`}
                data-card-padded style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-pill)', background: isSigned ? 'var(--color-success-bg)' : 'var(--color-warning-bg)', color: isSigned ? 'var(--color-success)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icons.ClipboardList size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: 'var(--space-1)' }}>
                    {l['propertyName'] as string} — Lease agreement
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' – '}
                    {end.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {!isSigned && (
                    <div style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      <Icons.PenLine size={14} /> Signature required
                    </div>
                  )}
                </div>
                <StatusBadge status={l['status'] as string} />
                <Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
