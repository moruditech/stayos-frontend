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
import type { ApiError, FolioPayment } from '@stayos/api-client';
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

function formatGateway(gateway: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash', card: 'Card', manual_eft: 'EFT',
    payfast: 'Payfast', ozow: 'Ozow', stripe: 'Card (online)',
    snapscan: 'SnapScan', zapper: 'Zapper',
  };
  return labels[gateway] ?? gateway;
}

// =============================================================================
// PRINT RECEIPT — item 2: email (see payments.service.js#resendReceipt,
// triggered from the modal below) + printing.
//
// Two printing paths, both built from the same ReceiptData, because there's
// no single option that works everywhere:
//  - printReceiptViaBrowser: opens a formatted page and calls window.print().
//    Works in every browser, on any printer the OS already knows about
//    (including a Bluetooth receipt printer paired at the OS level, which
//    is how most small properties actually have theirs set up) — this is
//    the one to reach for first.
//  - printReceiptViaBluetooth: talks directly to a printer over Web
//    Bluetooth with raw ESC/POS commands, no OS pairing/driver needed.
//    Real constraints, not implementation gaps: Web Bluetooth only exists
//    in Chrome/Edge (not Safari or Firefox, on any OS), and it can only
//    reach Bluetooth LE (GATT) devices — a great many inexpensive thermal
//    receipt printers are actually Classic Bluetooth (SPP, the kind that
//    pairs like a headset and shows up as a serial port), which no browser
//    can talk to at all. There's also no single standard GATT service
//    every BLE printer uses, so this probes the device for the first
//    writable characteristic it can find rather than assuming one UUID.
// =============================================================================

interface ReceiptData {
  propertyName: string;
  receiptNumber: string | undefined;
  date: string;
  confirmationNumber: string;
  guestName: string;
  method: string;
  reference: string | undefined;
  amount: number;
  balance: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function printReceiptViaBrowser(data: ReceiptData): void {
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) {
    throw new Error('Please allow pop-ups for this site to print the receipt.');
  }
  const rows: [string, string][] = [
    ['Date', new Date(data.date).toLocaleString('en-ZA')],
    ['Booking', data.confirmationNumber],
    ['Guest', data.guestName],
    ['Method', data.method],
    ...(data.reference ? ([['Reference', data.reference]] as [string, string][]) : []),
  ];
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Receipt${data.receiptNumber ? ' ' + escapeHtml(data.receiptNumber) : ''}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 280px;
    margin: 16px auto;
    color: #000;
    background: #fff;
    font-size: 13px;
  }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
  .sub { text-align: center; font-size: 11px; margin-bottom: 10px; }
  .rule { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .total { font-weight: bold; font-size: 14px; }
  .center { text-align: center; }
</style>
</head>
<body>
  <h1>${escapeHtml(data.propertyName)}</h1>
  <div class="sub">Payment Receipt${data.receiptNumber ? ' — ' + escapeHtml(data.receiptNumber) : ''}</div>
  <div class="rule"></div>
  ${rows.map(([label, value]) => `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`).join('\n  ')}
  <div class="rule"></div>
  <div class="row total"><span>Amount paid</span><span>${escapeHtml(fmtCurrency(data.amount))}</span></div>
  <div class="row"><span>Balance due</span><span>${escapeHtml(fmtCurrency(data.balance))}</span></div>
  <div class="rule"></div>
  <div class="center">Thank you!</div>
</body>
</html>`);
  win.document.close();
  win.onload = () => win.print();
}

function buildEscPosReceipt(data: ReceiptData): Uint8Array {
  const ESC = 0x1b;
  const GS  = 0x1d;
  const encoder = new TextEncoder();
  const bytes: number[] = [];
  const push = (...b: number[]): void => { bytes.push(...b); };
  const text = (s: string): void => { bytes.push(...encoder.encode(s)); };
  const WIDTH = 32; // typical character width for a 58mm thermal printer
  const line = (label: string, value: string): void => {
    const gap = Math.max(1, WIDTH - label.length - value.length);
    text(`${label}${' '.repeat(gap)}${value}\n`);
  };

  push(ESC, 0x40);       // initialize
  push(ESC, 0x61, 0x01); // center align
  push(ESC, 0x45, 0x01); // bold on
  text(`${data.propertyName}\n`);
  push(ESC, 0x45, 0x00); // bold off
  text(`Payment Receipt${data.receiptNumber ? ' - ' + data.receiptNumber : ''}\n`);
  push(ESC, 0x61, 0x00); // left align
  text('-'.repeat(WIDTH) + '\n');
  line('Date', new Date(data.date).toLocaleDateString('en-ZA'));
  line('Booking', data.confirmationNumber);
  line('Guest', data.guestName);
  line('Method', data.method);
  if (data.reference) line('Reference', data.reference);
  text('-'.repeat(WIDTH) + '\n');
  push(ESC, 0x45, 0x01);
  line('Amount paid', fmtCurrency(data.amount));
  push(ESC, 0x45, 0x00);
  line('Balance due', fmtCurrency(data.balance));
  text('-'.repeat(WIDTH) + '\n');
  push(ESC, 0x61, 0x01);
  text('Thank you!\n\n\n');
  push(GS, 0x56, 0x00);  // full cut — harmless no-op on printers without a cutter

  return new Uint8Array(bytes);
}

// Common service UUIDs seen across many inexpensive 58mm/80mm BLE thermal
// printers — there is no single industry standard, so this is a best-effort
// allow-list (Web Bluetooth requires declaring candidate services up front)
// rather than a guarantee any specific printer is covered.
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

// Web Bluetooth has no TypeScript DOM lib types (it isn't a full W3C
// standard and this repo doesn't depend on @types/web-bluetooth) — these
// are the minimal shapes this file actually calls, typed locally rather
// than pulling in a whole ambient declaration package for one feature.
interface BleCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue: (data: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
}
interface BleService {
  getCharacteristics: () => Promise<BleCharacteristic[]>;
}
interface BleServer {
  connect: () => Promise<BleServer>;
  getPrimaryServices: () => Promise<BleService[]>;
}
interface BleDevice {
  gatt?: BleServer;
}
interface BluetoothNavigator {
  bluetooth: {
    requestDevice: (options: { acceptAllDevices?: boolean; optionalServices?: string[] }) => Promise<BleDevice>;
  };
}

async function findWritableCharacteristic(server: BleServer): Promise<BleCharacteristic> {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) return writable;
  }
  throw new Error('No printable service found on that device. Try "Print (browser)" instead.');
}

async function writeInChunks(characteristic: BleCharacteristic, bytes: Uint8Array): Promise<void> {
  const CHUNK = 100; // conservative for default BLE MTU
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.slice(i, i + CHUNK);
    if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
  }
}

async function printReceiptViaBluetooth(data: ReceiptData): Promise<void> {
  const nav = navigator as unknown as Partial<BluetoothNavigator>;
  if (!nav.bluetooth) {
    throw new Error("Bluetooth printing needs Chrome or Edge — this browser doesn't support it.");
  }
  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_SERVICES,
  });
  if (!device.gatt) {
    throw new Error("That device doesn't support the Bluetooth connection this needs.");
  }
  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);
  await writeInChunks(characteristic, buildEscPosReceipt(data));
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
  // Matches Payment.gateway exactly — cash/card/manual_eft are the three
  // staff-recorded-in-person options (see Payment.model.js for why the
  // other enum values — payfast, ozow, etc — are online-gateway-only and
  // don't belong in this manual-entry form).
  gateway:   z.enum(['cash', 'card', 'manual_eft'], { errorMap: () => ({ message: 'Payment method is required' }) }),
  amount:    z.number({ invalid_type_error: 'Enter an amount' }).positive('Amount must be greater than 0'),
  reference: z.string().optional(),
  last4:     z.string().max(4).optional(),
  note:      z.string().optional(),
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
  const [receiptPayment, setReceiptPayment] = useState<FolioPayment | null>(null);
  const [printing, setPrinting] = useState<'bluetooth' | null>(null);

  const { data: folio, isLoading } = useQuery({
    queryKey: folioKeys.detail(id),
    queryFn: () => api.folios.get(id),
  });

  // Property name for the receipt header — same query the portal layout
  // already runs (queryKey ['tenants','me']), so this reads from cache
  // rather than firing a second request in practice.
  const { data: property } = useQuery({
    queryKey: ['tenants', 'me'],
    queryFn: () => api.tenants.getMe() as unknown as Promise<{ name: string }>,
  });

  const resendReceiptMutation = useMutation({
    mutationFn: (paymentId: string) => api.folios.resendReceipt(paymentId),
    onSuccess: () => toast('Receipt emailed to the guest.', 'success'),
    onError: (err: ApiError) => toast(err.message ?? 'Could not send the receipt.', 'error'),
  });

  const chargeForm = useForm<ChargeInput>({ resolver: zodResolver(chargeSchema), defaultValues: { quantity: 1 } });
  const settleForm = useForm<SettleInput>({ resolver: zodResolver(settleSchema) });
  const openSettleModal = (): void => {
    settleForm.reset({ amount: folio?.balance ?? 0 });
    setShowSettleModal(true);
  };

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
    mutationFn: (input: SettleInput) => api.folios.settle(id, input),
    onSuccess: (updatedFolio) => {
      void queryClient.invalidateQueries({ queryKey: folioKeys.detail(id) });
      setShowSettleModal(false);
      settleForm.reset();
      const stillOwing = updatedFolio.balance;
      toast(
        stillOwing > 0.01
          ? `Payment recorded — ${fmtCurrency(stillOwing)} still outstanding.`
          : 'Payment recorded — folio settled.',
        'success'
      );
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
  const hasBalance = f.balance > 0;

  return (
    <div data-page="folio-detail">
      <div data-page-header>
        <div>
          <Link href="/bookings" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Bookings</Link>
          <h1>Folio — {f.bookingId.confirmationNumber}</h1>
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
            href={api.folios.getInvoicePdfUrl(id)}
            filename={`folio-${f.bookingId.confirmationNumber}.pdf`}
            label="Print folio"
          />
        </div>
      </div>

      {/* Financial summary bar */}
      <div data-folio-summary-bar>
        <div data-summary-item>
          <span data-summary-label>Total charges</span>
          <span data-summary-value>{fmtCurrency(f.grandTotal)}</span>
        </div>
        <div data-summary-item>
          <span data-summary-label>Total payments</span>
          <span data-summary-value>{fmtCurrency(f.paidAmount)}</span>
        </div>
        <div data-summary-item data-balance-due={hasBalance || undefined}>
          <span data-summary-label>Balance due</span>
          <span data-summary-value data-highlight={hasBalance || undefined}>
            {fmtCurrency(f.balance)}
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
                <tr key={item._id} data-line-item data-voided={item.isVoided || undefined}>
                  <td>{new Date(item.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td>
                  <td>{item.description}</td>
                  <td data-line-type>{item.type}</td>
                  <td>{item.quantity}</td>
                  <td>{fmtCurrency(item.unitPrice)}</td>
                  <td data-amount>{fmtCurrency(item.amount)}</td>
                  <td>
                    {!item.isVoided && (
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
                <td>{fmtCurrency(f.subTotal)}</td>
                <td />
              </tr>
              {f.taxTotal > 0 && (
                <tr>
                  <td colSpan={5} data-total-label>Tax</td>
                  <td>{fmtCurrency(f.taxTotal)}</td>
                  <td />
                </tr>
              )}
              <tr data-folio-total-row>
                <td colSpan={5} data-total-label>Total charges</td>
                <td data-amount data-grand-total>{fmtCurrency(f.grandTotal)}</td>
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
                {hasBalance && (
                  <button
                    type="button"
                    data-btn-ghost data-btn-sm
                    onClick={openSettleModal}
                  >
                    + Add payment
                  </button>
                )}
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
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {f.payments.map((pmt) => (
                    <tr key={pmt._id}>
                      <td>{new Date(pmt.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td>
                      <td>{pmt.type}</td>
                      <td>{pmt.reference ?? '—'}</td>
                      <td data-amount>{fmtCurrency(pmt.amount)}</td>
                      <td>
                        <button
                          type="button"
                          data-btn-ghost data-btn-sm
                          onClick={() => setReceiptPayment(pmt)}
                        >
                          <Icons.Receipt size={14} aria-hidden="true" />
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div data-payment-totals>
              <ReadOnlyField label="Total payments" value={fmtCurrency(f.paidAmount)} />
              <ReadOnlyField
                label="Balance due"
                value={
                  <span data-balance={hasBalance ? 'outstanding' : 'clear'}>
                    {fmtCurrency(f.balance)}
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
                  onClick={openSettleModal}
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
            <select id="settleMethod" {...settleForm.register('gateway')}>
              <option value="">Select…</option>
              <option value="cash">Cash</option>
              <option value="card">Card (in-person)</option>
              <option value="manual_eft">EFT / bank transfer</option>
            </select>
            <InlineError message={settleForm.formState.errors.gateway?.message} />
          </div>
          {settleForm.watch('gateway') === 'card' && (
            <div data-form-group>
              <label htmlFor="settleLast4">Last 4 digits <span data-optional>(optional)</span></label>
              <input id="settleLast4" type="text" maxLength={4} {...settleForm.register('last4')} />
            </div>
          )}
          <div data-form-group>
            <label htmlFor="settleAmount">Amount</label>
            <input id="settleAmount" type="number" step="0.01" min="0.01"
              {...settleForm.register('amount', { valueAsNumber: true })} />
            <InlineError message={settleForm.formState.errors.amount?.message} />
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
            <ReadOnlyField label="Outstanding balance" value={fmtCurrency(f.balance)} />
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

      {/* Print receipt modal */}
      <Modal
        open={!!receiptPayment}
        onClose={() => { setReceiptPayment(null); setPrinting(null); }}
        title="Print receipt"
      >
        {receiptPayment && (() => {
          const data: ReceiptData = {
            propertyName:       property?.name ?? 'Receipt',
            receiptNumber:      receiptPayment.receiptNumber,
            date:               receiptPayment.date,
            confirmationNumber: f.bookingId.confirmationNumber,
            guestName:          `${f.customerId.firstName} ${f.customerId.lastName}`.trim(),
            method:             formatGateway(receiptPayment.type),
            reference:          receiptPayment.reference,
            amount:             receiptPayment.amount,
            balance:            f.balance,
          };
          const payment = receiptPayment;

          return (
            <div>
              <div data-field-list>
                <ReadOnlyField label="Guest" value={data.guestName} />
                <ReadOnlyField label="Amount" value={fmtCurrency(data.amount)} />
                <ReadOnlyField label="Method" value={data.method} />
                <ReadOnlyField label="Date" value={new Date(data.date).toLocaleDateString('en-ZA')} />
              </div>

              <div data-action-bar style={{ marginTop: 'var(--space-4)' }}>
                <button
                  type="button" data-btn-secondary
                  disabled={resendReceiptMutation.isPending}
                  onClick={() => resendReceiptMutation.mutate(payment._id)}
                >
                  <Icons.Mail size={15} aria-hidden="true" />
                  {resendReceiptMutation.isPending ? 'Sending…' : 'Email receipt'}
                </button>

                {payment.receiptUrl && (
                  <a href={payment.receiptUrl} target="_blank" rel="noreferrer" data-btn-secondary>
                    <Icons.Download size={15} aria-hidden="true" />
                    Download PDF
                  </a>
                )}

                <button
                  type="button" data-btn-secondary
                  onClick={() => {
                    try {
                      printReceiptViaBrowser(data);
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Could not print the receipt.', 'error');
                    }
                  }}
                >
                  <Icons.Receipt size={15} aria-hidden="true" />
                  Print (browser)
                </button>

                <button
                  type="button" data-btn-secondary
                  disabled={printing === 'bluetooth'}
                  onClick={() => {
                    setPrinting('bluetooth');
                    printReceiptViaBluetooth(data)
                      .then(() => toast('Sent to printer.', 'success'))
                      .catch((err: unknown) =>
                        toast(err instanceof Error ? err.message : 'Could not print via Bluetooth.', 'error'))
                      .finally(() => setPrinting(null));
                  }}
                >
                  <Icons.Zap size={15} aria-hidden="true" />
                  {printing === 'bluetooth' ? 'Connecting…' : 'Print via Bluetooth'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
