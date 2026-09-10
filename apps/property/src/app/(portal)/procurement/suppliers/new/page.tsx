'use client';

import Link from 'next/link';

/**
 * Add supplier — Procurement.
 * Field names match the backend `supplierSchema` exactly
 * (src/modules/procurement/procurement.validation.js).
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast, Icons, MultiSelectDropdown, Dropdown } from '@stayos/ui';
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

export default function NewSupplierPage(): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, categories: [] },
  });

  const createMutation = useMutation({
    mutationFn: (input: FormInput) => {
      const { contactEmail, ...rest } = input;
      return api.procurement.createSupplier({
        ...rest,
        ...(contactEmail ? { contactEmail } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.suppliers() });
      toast('Supplier added.', 'success');
      router.replace('/procurement/suppliers');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to add supplier.', 'error');
    },
  });

  return (
    <div data-page="new-supplier">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>Add supplier</h1>
        </div>
      </div>

      <div data-form-container>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
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
                <Dropdown
                  id="sup-type"
                  options={SUPPLIER_TYPE_OPTIONS}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Select type…"
                />
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
            <p data-field-hint>What this supplier provides — used to match them against stock items.</p>
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
            <p data-field-hint>Needed if you want to send purchase orders to this supplier by email.</p>
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
            <Link href="/procurement/suppliers" data-btn-ghost>Cancel</Link>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding supplier…' : 'Add supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
