'use client';

import Link from 'next/link';

/**
 * Procurement hub — TAD 11 §14.
 * The entire module sits behind a single procurement:manage permission.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, Icons } from '@stayos/ui';
import { procurementKeys } from '@/lib/query-keys';

export default function ProcurementSuppliersPage(): React.ReactElement {
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: procurementKeys.suppliers(),
    queryFn: () => api.procurement.listSuppliers(),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['procurement', 'low-stock'],
    queryFn: () => api.procurement.getLowStock(),
    staleTime: 120_000,
  });

  return (
    <div data-page="procurement">
      <div data-page-header>
        <h1>Procurement</h1>
        <Link href="/procurement/purchase-orders" data-btn-ghost>Purchase orders</Link>
        <Link href="/procurement/stock-items" data-btn-ghost>Stock items</Link>
        <Link href="/procurement/vendor-contracts" data-btn-ghost>Contracts</Link>
      </div>

      {/* Low-stock alert */}
      {(lowStock as unknown[])?.length > 0 && (
        <div role="alert" data-alert data-alert-warning>
          <strong>{(lowStock as unknown[]).length} items below reorder level.</strong>
          {' '}
          <Link href="/procurement/stock-items?filter=low" data-alert-link>
            View low stock <Icons.ArrowRight data-alert-link-icon aria-hidden="true" />
          </Link>
        </div>
      )}

      <section data-procurement-section>
        <div data-section-header>
          <h2>Suppliers</h2>
          <Link href="/procurement/suppliers/new" data-btn-primary>+ Add supplier</Link>
        </div>

        {suppliersLoading ? (
          <SkeletonLoader rows={4} />
        ) : !suppliers?.length ? (
          <EmptyState
            title="No suppliers"
            description="Add suppliers to manage procurement."
            action={<Link href="/procurement/suppliers/new" data-btn-primary>Add supplier</Link>}
          />
        ) : (
          <table data-table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const sup = s as unknown as Record<string, unknown>;
                return (
                  <tr key={String(sup['_id'])}>
                    <td>{String(sup['name'] ?? '—')}</td>
                    <td>{String(sup['contactEmail'] ?? sup['contactPhone'] ?? '—')}</td>
                    <td>{String(sup['category'] ?? '—')}</td>
                    <td><StatusBadge status={String(sup['status'] ?? 'active')} /></td>
                    <td>
                      <Link href={`/procurement/suppliers/${String(sup['_id'])}`}
                        data-btn-ghost data-btn-sm
                      >View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
