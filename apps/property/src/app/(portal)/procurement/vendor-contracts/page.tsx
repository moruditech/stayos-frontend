'use client';

import Link from 'next/link';

/**
 * Vendor contracts — Procurement.
 * Field names match the backend `vendorContractSchema` / `renewContractSchema`
 * exactly (src/modules/procurement/procurement.validation.js). Previous
 * versions of this form sent title/startDate/endDate/value — none of which
 * exist on the backend schema, and it never collected serviceCategory or
 * monthlyCost at all (both required) — so every submit silently 422'd.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError,
  ConfirmDialog, Icons, Dropdown,
} from '@stayos/ui';
import { procurementKeys } from '@/lib/query-keys';

const SERVICE_CATEGORIES = [
  'internet', 'security', 'pest_control', 'linen_rental',
  'cleaning_contract', 'generator_maintenance', 'other',
] as const;
const SERVICE_CATEGORY_LABELS: Record<(typeof SERVICE_CATEGORIES)[number], string> = {
  internet: 'Internet',
  security: 'Security',
  pest_control: 'Pest control',
  linen_rental: 'Linen rental',
  cleaning_contract: 'Cleaning contract',
  generator_maintenance: 'Generator maintenance',
  other: 'Other',
};
const SERVICE_CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((c) => ({ value: c, label: SERVICE_CATEGORY_LABELS[c] }));

const contractSchema = z.object({
  supplierId:      z.string().min(1, 'Supplier required'),
  serviceCategory: z.enum(SERVICE_CATEGORIES, { errorMap: () => ({ message: 'Service category required' }) }),
  contractStart:   z.string().min(1, 'Start date required'),
  contractEnd:     z.string().min(1, 'End date required'),
  monthlyCost:     z.coerce.number().positive('Monthly cost must be positive'),
  contactPerson:   z.string().optional(),
});
type ContractInput = z.infer<typeof contractSchema>;

const blankToUndefined = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

const renewSchema = z.object({
  contractEnd: z.string().min(1, 'New end date required'),
  monthlyCost: z.preprocess(blankToUndefined, z.coerce.number().positive().optional()),
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

function supplierNameOf(supplierField: unknown): string {
  if (supplierField && typeof supplierField === 'object') {
    return String((supplierField as Record<string, unknown>)['name'] ?? '—');
  }
  return String(supplierField ?? '—');
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
  const supplierOptions = (suppliers ?? []).map((s) => {
    const sup = s as unknown as Record<string, unknown>;
    return { value: String(sup['_id']), label: String(sup['name'] ?? '—') };
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
      toast('Contract cancelled.', 'success');
    },
    onError: (err: ApiError) => { setDeleteId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  // Contracts expiring within 30 days
  const expiringSoon = (contracts ?? []).filter((c) => {
    const ct = c as unknown as Record<string, unknown>;
    const end = String(ct['contractEnd'] ?? '');
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
        <button type="button" data-btn-primary onClick={() => { form.reset(); setShowNew(true); }}>+ Add contract</button>
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
              <th>Service</th><th>Supplier</th><th>Monthly cost</th>
              <th>Start</th><th>End</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => {
              const c = contract as unknown as Record<string, unknown>;
              const id = String(c['_id']);
              const endDate = String(c['contractEnd'] ?? '');
              const days = endDate ? daysUntilExpiry(endDate) : null;
              const isExpiring = days !== null && days > 0 && days <= 30;
              const isExpired = days !== null && days <= 0;
              const category = String(c['serviceCategory'] ?? '') as (typeof SERVICE_CATEGORIES)[number];
              return (
                <tr key={id} data-expiring={isExpiring || undefined} data-expired={isExpired || undefined}>
                  <td>{SERVICE_CATEGORY_LABELS[category] ?? '—'}</td>
                  <td>{supplierNameOf(c['supplierId'])}</td>
                  <td>{c['monthlyCost'] != null ? fmtCurrency(Number(c['monthlyCost'])) : '—'}</td>
                  <td>{c['contractStart'] ? fmtDate(String(c['contractStart'])) : '—'}</td>
                  <td>
                    {endDate ? fmtDate(endDate) : '—'}
                    {isExpiring && <span data-expiry-note> ({days}d)</span>}
                    {isExpired && <span data-expired-note> (expired)</span>}
                  </td>
                  <td><StatusBadge status={String(c['status'] ?? 'active')} /></td>
                  <td>
                    <div data-action-cluster>
                      <button type="button" data-btn-ghost data-btn-sm
                        onClick={() => { setRenewingId(id); renewForm.reset(); }}>Renew</button>
                      <button type="button" data-btn-ghost data-btn-sm data-destructive
                        onClick={() => setDeleteId(id)}>Cancel</button>
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
            <Controller
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <Dropdown id="vc-supplier" options={supplierOptions} value={field.value ?? ''} onChange={field.onChange} placeholder="Select supplier…" />
              )}
            />
            <InlineError message={form.formState.errors.supplierId?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="vc-category">Service category</label>
            <Controller
              control={form.control}
              name="serviceCategory"
              render={({ field }) => (
                <Dropdown id="vc-category" options={SERVICE_CATEGORY_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select service…" />
              )}
            />
            <InlineError message={form.formState.errors.serviceCategory?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="vc-cost">Monthly cost (ZAR)</label>
            <input id="vc-cost" type="number" min={0} step="0.01" {...form.register('monthlyCost')} />
            <InlineError message={form.formState.errors.monthlyCost?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="vc-start">Start date</label>
              <input id="vc-start" type="date" {...form.register('contractStart')} />
              <InlineError message={form.formState.errors.contractStart?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="vc-end">End date</label>
              <input id="vc-end" type="date" {...form.register('contractEnd')} />
              <InlineError message={form.formState.errors.contractEnd?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="vc-contact">Contact person <span data-optional>(optional)</span></label>
            <input id="vc-contact" type="text" {...form.register('contactPerson')} />
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
            <input id="rn-end" type="date" {...renewForm.register('contractEnd')} />
            <InlineError message={renewForm.formState.errors.contractEnd?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="rn-cost">New monthly cost (ZAR) <span data-optional>(optional)</span></label>
            <input id="rn-cost" type="number" min={0} step="0.01" placeholder="Leave blank to keep current cost" {...renewForm.register('monthlyCost')} />
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
        title="Cancel this contract?"
        message="The contract will be marked cancelled. This cannot be undone."
        confirmLabel="Cancel contract"
        cancelLabel="Keep contract"
        destructive
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
