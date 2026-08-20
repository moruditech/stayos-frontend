'use client';

/**
 * Procurement hub — TAD 11 §14.
 * The entire module sits behind a single procurement:manage permission.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge } from '@stayos/ui';
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
        <a href="/procurement/purchase-orders" data-btn-ghost>Purchase orders</a>
        <a href="/procurement/stock-items" data-btn-ghost>Stock items</a>
        <a href="/procurement/vendor-contracts" data-btn-ghost>Contracts</a>
      </div>

      {/* Low-stock alert */}
      {(lowStock as unknown[])?.length > 0 && (
        <div role="alert" data-alert data-alert-warning>
          <strong>{(lowStock as unknown[]).length} items below reorder level.</strong>
          {' '}
          <a href="/procurement/stock-items?filter=low" data-alert-link>
            View low stock →
          </a>
        </div>
      )}

      <section data-procurement-section>
        <div data-section-header>
          <h2>Suppliers</h2>
          <a href="/procurement/suppliers/new" data-btn-primary>+ Add supplier</a>
        </div>

        {suppliersLoading ? (
          <SkeletonLoader rows={4} />
        ) : !suppliers?.length ? (
          <EmptyState
            title="No suppliers"
            description="Add suppliers to manage procurement."
            action={<a href="/procurement/suppliers/new" data-btn-primary>Add supplier</a>}
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
                      <a
                        href={`/procurement/suppliers/${String(sup['_id'])}`}
                        data-btn-ghost data-btn-sm
                      >View</a>
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
