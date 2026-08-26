'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, ConfirmDialog, Icons } from '@stayos/ui';
import { procurementKeys } from '@/lib/query-keys';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PurchaseOrdersPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendId, setSendId] = useState<string | null>(null);
  const [receiveId, setReceiveId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: procurementKeys.purchaseOrders(),
    queryFn: () => api.procurement.listPurchaseOrders(),
    staleTime: 120_000,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.procurement.sendPurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      setSendId(null);
      toast('Purchase order sent to supplier.', 'success');
    },
    onError: (err: ApiError) => { setSendId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.procurement.receivePurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      void queryClient.invalidateQueries({ queryKey: procurementKeys.stockItems() });
      setReceiveId(null);
      toast('Purchase order marked as received. Stock updated.', 'success');
    },
    onError: (err: ApiError) => { setReceiveId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <div data-page="purchase-orders">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>Purchase orders</h1>
        </div>
        <Link href="/procurement/purchase-orders/new" data-btn-primary>+ New order</Link>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !orders?.length ? (
        <EmptyState
          title="No purchase orders"
          description="Create purchase orders to track orders from suppliers."
          action={<Link href="/procurement/purchase-orders/new" data-btn-primary>Create first order</Link>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const o = order as unknown as Record<string, unknown>;
              const id = String(o['_id']);
              const status = String(o['status'] ?? 'draft');
              const total = o['totalAmount'] != null ? fmtCurrency(Number(o['totalAmount'])) : '—';
              return (
                <tr key={id}>
                  <td><Link href={`/procurement/purchase-orders/${id}`} data-table-link>
                    PO-{id.slice(-6).toUpperCase()}
                  </Link></td>
                  <td>{String(o['supplierName'] ?? o['supplierId'] ?? '—')}</td>
                  <td>{o['createdAt'] ? fmtDate(String(o['createdAt'])) : '—'}</td>
                  <td>{total}</td>
                  <td><StatusBadge status={status} /></td>
                  <td>
                    <div data-action-cluster>
                      {status === 'draft' && (
                        <button type="button" data-btn-ghost data-btn-sm onClick={() => setSendId(id)}>
                          Send
                        </button>
                      )}
                      {status === 'sent' && (
                        <button type="button" data-btn-ghost data-btn-sm onClick={() => setReceiveId(id)}>
                          Mark received
                        </button>
                      )}
                      <Link href={`/procurement/purchase-orders/${id}`} data-btn-ghost data-btn-sm>View</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={!!sendId}
        title="Send this purchase order?"
        message="The order will be sent to the supplier. You can still edit it until they confirm."
        confirmLabel="Send order"
        cancelLabel="Cancel"
        onConfirm={() => { if (sendId) sendMutation.mutate(sendId); }}
        onCancel={() => setSendId(null)}
      />
      <ConfirmDialog
        open={!!receiveId}
        title="Mark as received?"
        message="This records that all items have been received. Stock levels will be updated automatically."
        confirmLabel="Mark received"
        cancelLabel="Cancel"
        onConfirm={() => { if (receiveId) receiveMutation.mutate(receiveId); }}
        onCancel={() => setReceiveId(null)}
      />
    </div>
  );
}
