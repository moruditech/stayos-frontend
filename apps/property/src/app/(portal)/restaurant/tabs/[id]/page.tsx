'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import {
  RoleGate,
  PlanGate,
  Modal,
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  ReadOnlyField,
  InlineError,
  useToast,
  applyServerErrors,
} from '@stayos/ui';
import { tabKeys } from '@/lib/query-keys';

const voidSchema = z.object({ voidReason: z.string().min(1, 'A reason is required') });
type VoidFormValues = z.infer<typeof voidSchema>;

export default function TabDetailPage({ params }: { params: { id: string } }): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_TAB_MANAGE}
      fallback={<EmptyState title="You don't have access to tabs oversight" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <TabDetailContent tabId={params.id} />
      </PlanGate>
    </RoleGate>
  );
}

function TabDetailContent({ tabId }: { tabId: string }): React.ReactElement {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showVoidModal, setShowVoidModal] = useState(false);

  const { data: tab, isLoading: tabLoading } = useQuery({
    queryKey: tabKeys.detail(tabId),
    queryFn: () => api.restaurantTabs.get(tabId),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['restaurant', 'tabs', tabId, 'orders'],
    queryFn: () => api.restaurantTabs.listOrders({ tabId, limit: 100 }),
  });
  const orders = ordersData?.data ?? [];

  const { data: paymentsData } = useQuery({
    queryKey: ['restaurant', 'tabs', tabId, 'payments'],
    queryFn: () => api.restaurantTabs.listPayments({ tabId, limit: 100 }),
  });
  const payments = paymentsData?.data ?? [];

  const cancelItemMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      api.restaurantTabs.cancelOrderItem(orderId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['restaurant', 'tabs', tabId, 'orders'] });
      void queryClient.invalidateQueries({ queryKey: tabKeys.detail(tabId) });
      toast('Line cancelled.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to cancel line.', 'error'),
  });

  const voidForm = useForm<VoidFormValues>({ resolver: zodResolver(voidSchema), defaultValues: { voidReason: '' } });

  const voidMutation = useMutation({
    mutationFn: (values: VoidFormValues) => api.restaurantTabs.voidManager(tabId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tabKeys.detail(tabId) });
      setShowVoidModal(false);
      toast('Tab force-closed.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(voidForm, err);
      else toast(err.message ?? 'Failed to close tab.', 'error');
    },
  });

  if (tabLoading) return <SkeletonLoader rows={6} />;
  if (!tab) return <EmptyState title="Tab not found" />;

  const tableLabel = typeof tab.tableId === 'object' && tab.tableId ? tab.tableId.label : 'Takeaway';
  const openedByName = typeof tab.openedBy === 'object' ? `${tab.openedBy.firstName} ${tab.openedBy.lastName}` : '—';

  return (
    <div data-page="restaurant-tab-detail">
      <div data-page-header>
        <div>
          <button type="button" data-btn-ghost onClick={() => router.push('/restaurant/tabs')}>
            ← Back to Tabs
          </button>
          <h1>{tab.label}</h1>
        </div>
        {tab.status === 'open' && (
          <button type="button" data-btn-ghost onClick={() => setShowVoidModal(true)}>
            Force-close tab
          </button>
        )}
      </div>

      <div data-detail-grid>
        <div><dt>Status</dt><dd><StatusBadge status={tab.status} /></dd></div>
        <div><dt>Table</dt><dd>{tableLabel}</dd></div>
        <div><dt>Covers</dt><dd>{tab.coverCount}</dd></div>
        <div><dt>Opened by</dt><dd>{openedByName}</dd></div>
        <div><dt>Opened at</dt><dd>{new Date(tab.openedAt).toLocaleString('en-ZA')}</dd></div>
        {tab.settledAt && <div><dt>Settled at</dt><dd>{new Date(tab.settledAt).toLocaleString('en-ZA')}</dd></div>}
      </div>

      <h2>Orders</h2>
      {ordersLoading ? (
        <SkeletonLoader rows={3} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders on this tab yet" />
      ) : (
        orders.map((order) => (
          <div key={order._id} data-panel style={{ marginBottom: 'var(--space-3)' }}>
            <div data-panel-header>
              <h3>Round — {order.firedAt ? new Date(order.firedAt).toLocaleTimeString('en-ZA') : 'not fired'}</h3>
              <StatusBadge status={order.status} />
            </div>
            <div data-panel-body data-tight="true">
              <table data-table>
                <thead>
                  <tr><th>Item</th><th>Qty</th><th>Line total</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        {item.snapshot.name}
                        {item.modifiers.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {item.modifiers.map((m) => m.optionName).join(', ')}
                          </div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>R{item.lineTotal.toFixed(2)}</td>
                      <td><StatusBadge status={item.fulfillmentStatus} /></td>
                      <td>
                        {!['delivered', 'cancelled'].includes(item.fulfillmentStatus) && (
                          <button
                            type="button"
                            data-btn-ghost
                            data-btn-sm
                            onClick={() => cancelItemMutation.mutate({ orderId: order._id, itemId: item._id })}
                          >
                            Void line
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <h2>Payments</h2>
      {payments.length === 0 ? (
        <EmptyState title="No payments recorded yet" />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Method</th><th>Amount</th><th>Tip</th><th>Status</th><th>Reference</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td>{p.method === 'card_yoco' ? 'Card (Yoco)' : p.method === 'room_charge' ? 'Room charge' : 'Cash'}</td>
                <td>R{p.amount.toFixed(2)}</td>
                <td>R{p.tipAmount.toFixed(2)}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>{p.cardMachineRef ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Totals</h2>
      <div data-detail-grid>
        <ReadOnlyField label="Subtotal" value={`R${tab.subtotal.toFixed(2)}`} />
        <ReadOnlyField label="VAT" value={`R${tab.vatTotal.toFixed(2)}`} />
        {tab.serviceCharge.applied && (
          <ReadOnlyField label={`Service charge (${tab.serviceCharge.percent}%)`} value={`R${tab.serviceCharge.amount.toFixed(2)}`} />
        )}
        {tab.discount.applied && (
          <ReadOnlyField label="Discount" value={`-R${tab.discount.amount.toFixed(2)}${tab.discount.reason ? ` (${tab.discount.reason})` : ''}`} />
        )}
        <ReadOnlyField label="Total" value={`R${tab.total.toFixed(2)}`} />
        <ReadOnlyField label="Paid" value={`R${tab.paidTotal.toFixed(2)}`} />
      </div>

      <Modal open={showVoidModal} onClose={() => setShowVoidModal(false)} title="Force-close tab">
        <form onSubmit={voidForm.handleSubmit((v) => voidMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label>Reason</label>
            <textarea rows={2} {...voidForm.register('voidReason')} />
            <InlineError message={voidForm.formState.errors.voidReason?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowVoidModal(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={voidMutation.isPending}>
              {voidMutation.isPending ? 'Closing…' : 'Force-close'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
