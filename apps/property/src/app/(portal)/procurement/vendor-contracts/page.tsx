'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, ConfirmDialog, Icons } from '@stayos/ui';
import { procurementKeys } from '@/lib/query-keys';

const contractSchema = z.object({
  supplierId:   z.string().min(1, 'Supplier required'),
  title:        z.string().min(1, 'Title required'),
  startDate:    z.string().min(1, 'Start date required'),
  endDate:      z.string().min(1, 'End date required'),
  value:        z.coerce.number().optional(),
  description:  z.string().optional(),
});
type ContractInput = z.infer<typeof contractSchema>;

const renewSchema = z.object({
  newEndDate: z.string().min(1, 'New end date required'),
  notes:      z.string().optional(),
});
type RenewInput = z.infer<typeof renewSchema>;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

export default function VendorContractsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: contracts, isLoading } = useQuery({
    queryKey: procurementKeys.vendorContracts(),
    queryFn: () => api.procurement.listVendorContracts(),
    staleTime: 120_000,
  });

  const { data: suppliers } = useQuery({
    queryKey: procurementKeys.suppliers(),
    queryFn: () => api.procurement.listSuppliers(),
    staleTime: 120_000,
  });

  const form = useForm<ContractInput>({ resolver: zodResolver(contractSchema) });
  const renewForm = useForm<RenewInput>({ resolver: zodResolver(renewSchema) });

  const createMutation = useMutation({
    mutationFn: (input: ContractInput) => api.procurement.createVendorContract(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.vendorContracts() });
      setShowNew(false); form.reset();
      toast('Contract added.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof ContractInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RenewInput }) =>
      api.procurement.renewVendorContract(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.vendorContracts() });
      setRenewingId(null); renewForm.reset();
      toast('Contract renewed.', 'success');
    },
    onError: (err: ApiError) => { setRenewingId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.procurement.deleteVendorContract(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.vendorContracts() });
      setDeleteId(null);
      toast('Contract deleted.', 'success');
    },
    onError: (err: ApiError) => { setDeleteId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  // Contracts expiring within 30 days
  const expiringSoon = (contracts ?? []).filter((c) => {
    const ct = c as unknown as Record<string, unknown>;
    const end = String(ct['endDate'] ?? '');
    if (!end) return false;
    const days = daysUntilExpiry(end);
    return days > 0 && days <= 30;
  });

  return (
    <div data-page="vendor-contracts">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>Vendor contracts</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>+ Add contract</button>
      </div>

      {expiringSoon.length > 0 && (
        <div role="alert" data-alert data-alert-warning>
          <strong>{expiringSoon.length} contract{expiringSoon.length !== 1 ? 's' : ''} expiring within 30 days.</strong>
        </div>
      )}

      {isLoading ? <SkeletonLoader rows={4} /> : !contracts?.length ? (
        <EmptyState
          title="No vendor contracts"
          description="Track supplier agreements and get notified before they expire."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Add first contract</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Title</th><th>Supplier</th><th>Value</th>
              <th>Start</th><th>End</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => {
              const c = contract as unknown as Record<string, unknown>;
              const id = String(c['_id']);
              const endDate = String(c['endDate'] ?? '');
              const days = endDate ? daysUntilExpiry(endDate) : null;
              const isExpiring = days !== null && days > 0 && days <= 30;
              const isExpired = days !== null && days <= 0;
              return (
                <tr key={id} data-expiring={isExpiring || undefined} data-expired={isExpired || undefined}>
                  <td>{String(c['title'] ?? '—')}</td>
                  <td>{String(c['supplierName'] ?? c['supplierId'] ?? '—')}</td>
                  <td>{c['value'] != null ? fmtCurrency(Number(c['value'])) : '—'}</td>
                  <td>{c['startDate'] ? fmtDate(String(c['startDate'])) : '—'}</td>
                  <td>
                    {endDate ? fmtDate(endDate) : '—'}
                    {isExpiring && <span data-expiry-note> ({days}d)</span>}
                    {isExpired && <span data-expired-note> (expired)</span>}
                  </td>
                  <td><StatusBadge status={String(c['status'] ?? 'active')} /></td>
                  <td>
                    <div data-action-cluster>
                      <Link href={`/procurement/vendor-contracts/${id}`} data-btn-ghost data-btn-sm>View</Link>
                      <button type="button" data-btn-ghost data-btn-sm
                        onClick={() => { setRenewingId(id); renewForm.reset(); }}>Renew</button>
                      <button type="button" data-btn-ghost data-btn-sm data-destructive
                        onClick={() => setDeleteId(id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* New contract modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add vendor contract">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="vc-supplier">Supplier</label>
            <select id="vc-supplier" {...form.register('supplierId')}>
              <option value="">Select supplier…</option>
              {(suppliers ?? []).map((s) => {
                const sup = s as unknown as Record<string, unknown>;
                return (
                  <option key={String(sup['_id'])} value={String(sup['_id'])}>
                    {String(sup['name'] ?? '—')}
                  </option>
                );
              })}
            </select>
            <InlineError message={form.formState.errors.supplierId?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="vc-title">Contract title</label>
            <input id="vc-title" type="text" placeholder="e.g. Laundry Services Agreement" {...form.register('title')} />
            <InlineError message={form.formState.errors.title?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="vc-value">Contract value (ZAR) <span data-optional>(optional)</span></label>
            <input id="vc-value" type="number" min={0} step="0.01" {...form.register('value')} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="vc-start">Start date</label>
              <input id="vc-start" type="date" {...form.register('startDate')} />
              <InlineError message={form.formState.errors.startDate?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="vc-end">End date</label>
              <input id="vc-end" type="date" {...form.register('endDate')} />
              <InlineError message={form.formState.errors.endDate?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="vc-desc">Description <span data-optional>(optional)</span></label>
            <textarea id="vc-desc" rows={2} {...form.register('description')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add contract'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Renew contract modal */}
      <Modal open={!!renewingId} onClose={() => setRenewingId(null)} title="Renew contract">
        <form
          onSubmit={renewForm.handleSubmit((v) => renewMutation.mutate({ id: renewingId!, input: v }))}
          noValidate data-form
        >
          <div data-form-group>
            <label htmlFor="rn-end">New end date</label>
            <input id="rn-end" type="date" {...renewForm.register('newEndDate')} />
            <InlineError message={renewForm.formState.errors.newEndDate?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="rn-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="rn-notes" rows={2} {...renewForm.register('notes')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setRenewingId(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={renewMutation.isPending}>
              {renewMutation.isPending ? 'Renewing…' : 'Renew contract'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this contract?"
        message="The contract record will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
