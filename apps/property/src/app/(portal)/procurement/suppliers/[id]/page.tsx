'use client';

import Link from 'next/link';

/**
 * Supplier detail + edit — Procurement.
 * Previously missing entirely, so "View" on the suppliers table 404'd.
 * Field names match the backend `supplierSchema` exactly.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  InlineError, applyServerErrors, useToast, Icons, MultiSelectDropdown, Dropdown,
  SkeletonLoader, StatusBadge, ReadOnlyField, ConfirmDialog,
} from '@stayos/ui';
import { procurementKeys } from '@/lib/query-keys';

const SUPPLIER_TYPES = ['stock_supplier', 'service_contractor', 'both'] as const;
const SUPPLIER_TYPE_LABELS: Record<(typeof SUPPLIER_TYPES)[number], string> = {
  stock_supplier: 'Stock supplier',
  service_contractor: 'Service contractor',
  both: 'Both',
};
const STOCK_CATEGORIES = ['linen', 'cleaning', 'toiletries', 'kitchen', 'office', 'maintenance', 'other'] as const;
const CATEGORY_OPTIONS = STOCK_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
const SUPPLIER_TYPE_OPTIONS = SUPPLIER_TYPES.map((t) => ({ value: t, label: SUPPLIER_TYPE_LABELS[t] }));

const schema = z.object({
  name:         z.string().min(1, 'Name is required'),
  supplierType: z.enum(SUPPLIER_TYPES, { errorMap: () => ({ message: 'Supplier type is required' }) }),
  categories:   z.array(z.string()).optional(),
  contactName:  z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes:        z.string().optional(),
  isActive:     z.boolean().default(true),
});
type FormInput = z.infer<typeof schema>;

export default function SupplierDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const supplierId = params.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const { data: supplier, isLoading } = useQuery({
    queryKey: procurementKeys.supplier(supplierId),
    queryFn: () => api.procurement.getSupplier(supplierId),
    enabled: !!supplierId,
  });

  const form = useForm<FormInput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!supplier) return;
    const s = supplier as unknown as Record<string, unknown>;
    form.reset({
      name:         String(s['name'] ?? ''),
      supplierType: (s['supplierType'] as FormInput['supplierType']) ?? 'stock_supplier',
      categories:   Array.isArray(s['categories']) ? (s['categories'] as string[]) : [],
      contactName:  String(s['contactName'] ?? ''),
      contactPhone: String(s['contactPhone'] ?? ''),
      contactEmail: String(s['contactEmail'] ?? ''),
      notes:        String(s['notes'] ?? ''),
      isActive:     s['isActive'] !== false,
    });
  }, [supplier]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: (input: FormInput) => {
      const { contactEmail, ...rest } = input;
      return api.procurement.updateSupplier(supplierId, {
        ...rest,
        contactEmail: contactEmail || undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.supplier(supplierId) });
      void queryClient.invalidateQueries({ queryKey: procurementKeys.suppliers() });
      toast('Supplier updated.', 'success');
      setEditing(false);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to update supplier.', 'error');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.procurement.deleteSupplier(supplierId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.suppliers() });
      toast('Supplier deactivated.', 'success');
      router.replace('/procurement/suppliers');
    },
    onError: (err: ApiError) => { setConfirmDeactivate(false); toast(err.message ?? 'Failed.', 'error'); },
  });

  if (isLoading || !supplier) {
    return (
      <div data-page="supplier-detail">
        <div data-page-header>
          <div>
            <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
            <h1>Supplier</h1>
          </div>
        </div>
        <SkeletonLoader rows={5} />
      </div>
    );
  }

  const s = supplier as unknown as Record<string, unknown>;
  const categories = Array.isArray(s['categories']) ? (s['categories'] as string[]) : [];

  return (
    <div data-page="supplier-detail">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>{String(s['name'] ?? 'Supplier')}</h1>
        </div>
        {!editing && (
          <div data-header-actions>
            <button type="button" data-btn-ghost data-destructive onClick={() => setConfirmDeactivate(true)}>
              Deactivate
            </button>
            <button type="button" data-btn-primary onClick={() => setEditing(true)}>Edit supplier</button>
          </div>
        )}
      </div>

      {!editing ? (
        <div data-form-container>
          <div data-stat-grid>
            <ReadOnlyField label="Status" value={<StatusBadge status={s['isActive'] === false ? 'inactive' : 'active'} />} />
            <ReadOnlyField label="Supplier type" value={SUPPLIER_TYPE_LABELS[(s['supplierType'] as FormInput['supplierType']) ?? 'stock_supplier']} />
            <ReadOnlyField
              label="Categories"
              value={categories.length ? categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ') : '—'}
            />
          </div>
          <div data-stat-grid>
            <ReadOnlyField label="Contact name" value={String(s['contactName'] ?? '—')} />
            <ReadOnlyField label="Contact phone" value={String(s['contactPhone'] ?? '—')} />
            <ReadOnlyField label="Contact email" value={String(s['contactEmail'] ?? '—')} />
          </div>
          {Boolean(s['notes']) && (
            <div data-form-group>
              <label>Notes</label>
              <p>{String(s['notes'])}</p>
            </div>
          )}
          {!s['contactEmail'] && (
            <div role="alert" data-alert data-alert-warning>
              No contact email on file — purchase orders can&apos;t be emailed to this supplier until one is added.
            </div>
          )}
        </div>
      ) : (
        <div data-form-container>
          <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} noValidate data-form>
            <div data-form-group>
              <label htmlFor="sup-name">Supplier name</label>
              <input id="sup-name" type="text" {...form.register('name')} />
              <InlineError message={form.formState.errors.name?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="sup-type">Supplier type</label>
              <Controller
                control={form.control}
                name="supplierType"
                render={({ field }) => (
                  <Dropdown id="sup-type" options={SUPPLIER_TYPE_OPTIONS} value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
              <InlineError message={form.formState.errors.supplierType?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="sup-categories">Categories <span data-optional>(optional)</span></label>
              <Controller
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <MultiSelectDropdown
                    id="sup-categories"
                    options={CATEGORY_OPTIONS}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select categories…"
                  />
                )}
              />
            </div>

            <div data-form-row>
              <div data-form-group>
                <label htmlFor="sup-contact-name">Contact name <span data-optional>(optional)</span></label>
                <input id="sup-contact-name" type="text" {...form.register('contactName')} />
              </div>
              <div data-form-group>
                <label htmlFor="sup-contact-phone">Contact phone <span data-optional>(optional)</span></label>
                <input id="sup-contact-phone" type="tel" {...form.register('contactPhone')} />
              </div>
            </div>

            <div data-form-group>
              <label htmlFor="sup-contact-email">Contact email <span data-optional>(optional)</span></label>
              <input id="sup-contact-email" type="email" {...form.register('contactEmail')} />
              <InlineError message={form.formState.errors.contactEmail?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="sup-notes">Notes <span data-optional>(optional)</span></label>
              <textarea id="sup-notes" rows={3} {...form.register('notes')} />
            </div>

            <div data-form-group data-checkbox-group>
              <label data-checkbox-label>
                <input type="checkbox" {...form.register('isActive')} />
                Active
              </label>
            </div>

            <div data-form-actions>
              <button type="button" data-btn-ghost onClick={() => { setEditing(false); form.reset(); }}>Cancel</button>
              <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this supplier?"
        message="The supplier will be marked inactive and hidden from new orders. This can be reversed by an admin later."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => deactivateMutation.mutate()}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  );
}
