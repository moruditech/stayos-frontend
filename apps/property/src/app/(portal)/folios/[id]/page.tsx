'use client';

import Link from 'next/link';

/**
 * Folio detail — staff view.
 * Matches the design image showing charges table, payments summary,
 * folio summary, and checkout panel side-by-side.
 *
 * TAD 11 §6 routes:
 *  - GET  /folios/:id             → folio:read
 *  - POST /folios/:id/charge      → folio:manage
 *  - POST /folios/:id/void/:lineItemId → folio:manage
 *  - POST /folios/:id/settle      → folio:manage
 *  - GET  /folios/:id/pdf         → folio:read
 *
 * version field on folio is sent back on mutations (optimistic concurrency).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  StatusBadge,
  ReadOnlyField,
  useToast,
  RoleGate,
  Modal,
  InlineError,
  applyServerErrors,
  DownloadButton, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { folioKeys } from '@/lib/query-keys';

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
}

// Must match backend FOLIO_LINE_ITEM_TYPE (src/utils/constants.js) exactly —
// the backend reads `type`, not `department`, from the charge request body.
const FOLIO_LINE_ITEM_TYPES = [
  'room_charge', 'extra_service', 'damage', 'late_checkout_fee',
  'discount', 'tax', 'deposit', 'refund', 'adjustment',
  'minibar', 'food_and_beverage', 'spa', 'activity',
] as const;

const chargeSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  type:        z.enum(FOLIO_LINE_ITEM_TYPES, { errorMap: () => ({ message: 'Type is required' }) }),
  quantity:    z.coerce.number().min(1).default(1),
  unitPrice:   z.coerce.number().min(0, 'Price must be positive'),
});
type ChargeInput = z.infer<typeof chargeSchema>;

const settleSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference:     z.string().optional(),
  last4:         z.string().max(4).optional(),
  note:          z.string().optional(),
});
type SettleInput = z.infer<typeof settleSchema>;

export default function FolioDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const { data: folio, isLoading } = useQuery({
    queryKey: folioKeys.detail(id),
    queryFn: () => api.folios.get(id),
  });

  const chargeForm = useForm<ChargeInput>({ resolver: zodResolver(chargeSchema), defaultValues: { quantity: 1 } });
  const settleForm = useForm<SettleInput>({ resolver: zodResolver(settleSchema) });

  const chargeMutation = useMutation({
    mutationFn: (input: ChargeInput) => api.folios.postCharge(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: folioKeys.detail(id) });
      setShowChargeModal(false);
      chargeForm.reset();
      toast('Charge posted.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'READ_ONLY_ACCESS') toast('This action is not available in view-only mode.', 'error');
      else if (err.code === 'VALIDATION_ERROR') applyServerErrors(chargeForm, err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const voidMutation = useMutation({
    mutationFn: (lineItemId: string) => api.folios.voidCharge(id, lineItemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: folioKeys.detail(id) });
      setVoidingId(null);
      toast('Charge voided.', 'success');
    },
    onError: (err: ApiError) => {
      setVoidingId(null);
      if (err.code === 'READ_ONLY_ACCESS') toast('Not available in view-only mode.', 'error');
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const settleMutation = useMutation({
    mutationFn: (input: SettleInput) => api.folios.settle(id, input as unknown as Parameters<typeof api.folios.settle>[1]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: folioKeys.detail(id) });
      setShowSettleModal(false);
      settleForm.reset();
      toast('Folio settled.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'READ_ONLY_ACCESS') toast('Not available in view-only mode.', 'error');
      else if (err.code === 'VALIDATION_ERROR') applyServerErrors(settleForm, err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={8} />;
  if (!folio) return <p>Folio not found.</p>;

  const f = folio;
  const hasBalance = f.balanceDue > 0;

  return (
    <div data-page="folio-detail">
      <div data-page-header>
        <div>
          <Link href="/bookings" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Bookings</Link>
          <h1>Folio {f.folioNumber}</h1>
        </div>
        <div data-header-actions>
          <RoleGate perm={PERMISSIONS.FOLIO_MANAGE}>
            <button
              type="button"
              data-btn-primary
              onClick={() => setShowChargeModal(true)}
            >
              + Add charge
            </button>
          </RoleGate>
          <DownloadButton
            href={async () => {
              const result = await api.folios.getPdfUrl(id);
              return result.url;
            }}
            filename={`folio-${f.folioNumber}.pdf`}
            label="Print folio"
          />
        </div>
      </div>

      {/* Financial summary bar */}
      <div data-folio-summary-bar>
        <div data-summary-item>
          <span data-summary-label>Total charges</span>
          <span data-summary-value>{fmtCurrency(f.totalCharges)}</span>
        </div>
        <div data-summary-item>
          <span data-summary-label>Total payments</span>
          <span data-summary-value>{fmtCurrency(f.totalPayments)}</span>
        </div>
        <div data-summary-item data-balance-due={hasBalance || undefined}>
          <span data-summary-label>Balance due</span>
          <span data-summary-value data-highlight={hasBalance || undefined}>
            {fmtCurrency(f.balanceDue)}
          </span>
        </div>
        <div data-summary-item>
          <span data-summary-label>Status</span>
          <StatusBadge status={f.status} />
        </div>
      </div>

      <div data-folio-grid>
        {/* Charges column */}
        <section data-folio-section data-folio-charges>
          <div data-section-header>
            <h2>Charges <span data-count>({f.lineItems.length})</span></h2>
          </div>
          <table data-table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {f.lineItems.map((item) => (
                <tr key={item._id} data-line-item data-voided={item.voided || undefined}>
                  <td>{new Date(item.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td>
                  <td>{item.description}</td>
                  <td data-line-type>{item.type}</td>
                  <td>{item.quantity}</td>
                  <td>{fmtCurrency(item.unitPrice)}</td>
                  <td data-amount>{fmtCurrency(item.amount)}</td>
                  <td>
                    {!item.voided && (
                      <RoleGate perm={PERMISSIONS.FOLIO_MANAGE}>
                        <button
                          type="button"
                          data-btn-ghost data-btn-sm data-destructive
                          disabled={voidingId === item._id}
                          onClick={() => {
                            setVoidingId(item._id);
                            voidMutation.mutate(item._id);
                          }}
                        >
                          Void
                        </button>
                      </RoleGate>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr data-folio-totals>
                <td colSpan={5} data-total-label>Subtotal</td>
                <td>{fmtCurrency(f.subtotal)}</td>
                <td />
              </tr>
              {f.discountAmount > 0 && (
                <tr>
                  <td colSpan={5} data-total-label>Discount</td>
                  <td>−{fmtCurrency(f.discountAmount)}</td>
                  <td />
                </tr>
              )}
              <tr data-folio-total-row>
                <td colSpan={5} data-total-label>Total charges</td>
                <td data-amount data-grand-total>{fmtCurrency(f.totalCharges)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Payments + checkout column */}
        <div data-folio-right-col>
          <section data-folio-section data-folio-payments>
            <div data-section-header>
              <h2>Payments</h2>
              <RoleGate perm={PERMISSIONS.FOLIO_MANAGE}>
                <button
                  type="button"
                  data-btn-ghost data-btn-sm
                  onClick={() => setShowSettleModal(true)}
                >
                  + Add payment
                </button>
              </RoleGate>
            </div>
            {!f.payments.length ? (
              <p data-empty-note>No payments recorded.</p>
            ) : (
              <table data-table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {f.payments.map((pmt) => (
                    <tr key={pmt._id}>
                      <td>{new Date(pmt.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td>
                      <td>{pmt.type}</td>
                      <td>{pmt.last4 ? `Card ···· ${pmt.last4}` : (pmt.reference ?? '—')}</td>
                      <td data-amount>{fmtCurrency(pmt.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div data-payment-totals>
              <ReadOnlyField label="Total payments" value={fmtCurrency(f.totalPayments)} />
              <ReadOnlyField
                label="Balance due"
                value={
                  <span data-balance={hasBalance ? 'outstanding' : 'clear'}>
                    {fmtCurrency(f.balanceDue)}
                  </span>
                }
              />
            </div>
          </section>

          {/* Checkout panel */}
          {hasBalance && (
            <section data-folio-section data-checkout-panel>
              <h2>Checkout</h2>
              {hasBalance && (
                <div data-balance-notice role="alert">
                  Balance outstanding — collect the remaining balance before checkout.
                </div>
              )}
              <RoleGate perm={PERMISSIONS.FOLIO_MANAGE}>
                <button
                  type="button"
                  data-btn-primary data-btn-full
                  onClick={() => setShowSettleModal(true)}
                >
                  Settle folio
                </button>
              </RoleGate>
            </section>
          )}
        </div>
      </div>

      {/* Add charge modal */}
      <Modal
        open={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        title="Add charge"
      >
        <form
          onSubmit={chargeForm.handleSubmit((v) => chargeMutation.mutate(v))}
          noValidate
          data-form
        >
          <div data-form-group>
            <label htmlFor="chargeDesc">Description</label>
            <input id="chargeDesc" type="text" {...chargeForm.register('description')} />
            <InlineError message={chargeForm.formState.errors.description?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="chargeType">Type</label>
            <select id="chargeType" {...chargeForm.register('type')} defaultValue="">
              <option value="" disabled>Select…</option>
              <option value="room_charge">Room charge</option>
              <option value="extra_service">Extra service</option>
              <option value="minibar">Minibar</option>
              <option value="food_and_beverage">Food &amp; beverage</option>
              <option value="spa">Spa</option>
              <option value="activity">Activity</option>
              <option value="late_checkout_fee">Late checkout fee</option>
              <option value="damage">Damage</option>
              <option value="deposit">Deposit</option>
              <option value="discount">Discount</option>
              <option value="tax">Tax</option>
              <option value="adjustment">Adjustment</option>
              <option value="refund">Refund</option>
            </select>
            <InlineError message={chargeForm.formState.errors.type?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="chargeQty">Qty</label>
              <input id="chargeQty" type="number" min={1} {...chargeForm.register('quantity')} />
            </div>
            <div data-form-group>
              <label htmlFor="chargePrice">Unit price (ZAR)</label>
              <input id="chargePrice" type="number" step="0.01" min={0} {...chargeForm.register('unitPrice')} />
              <InlineError message={chargeForm.formState.errors.unitPrice?.message} />
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowChargeModal(false)}>
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={chargeMutation.isPending}>
              {chargeMutation.isPending ? 'Posting…' : 'Post charge'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Settle folio modal */}
      <Modal
        open={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Settle folio"
      >
        <form
          onSubmit={settleForm.handleSubmit((v) => settleMutation.mutate(v))}
          noValidate
          data-form
        >
          <div data-form-group>
            <label htmlFor="settleMethod">Payment method</label>
            <select id="settleMethod" {...settleForm.register('paymentMethod')}>
              <option value="">Select…</option>
              <option value="credit_card">Credit card</option>
              <option value="debit_card">Debit card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="eft">EFT</option>
            </select>
            <InlineError message={settleForm.formState.errors.paymentMethod?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="settleLast4">Last 4 digits <span data-optional>(card only)</span></label>
            <input id="settleLast4" type="text" maxLength={4} {...settleForm.register('last4')} />
          </div>
          <div data-form-group>
            <label htmlFor="settleRef">Reference <span data-optional>(optional)</span></label>
            <input id="settleRef" type="text" {...settleForm.register('reference')} />
          </div>
          <div data-form-group>
            <label htmlFor="settleNote">Note <span data-optional>(optional)</span></label>
            <textarea id="settleNote" rows={2} {...settleForm.register('note')} />
          </div>
          <div data-settle-summary>
            <ReadOnlyField label="Amount to collect" value={fmtCurrency(f.balanceDue)} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowSettleModal(false)}>
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={settleMutation.isPending}>
              {settleMutation.isPending ? 'Settling…' : 'Process payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
