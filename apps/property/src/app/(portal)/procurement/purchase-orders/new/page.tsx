'use client';

import Link from 'next/link';

/**
 * New purchase order — Procurement.
 * Field names match the backend `purchaseOrderSchema` exactly
 * (src/modules/procurement/procurement.validation.js): supplierId,
 * items[] ({ stockItemId, quantity, unitCost }), notes.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast, Icons, ReadOnlyField } from '@stayos/ui';
import { procurementKeys } from '@/lib/query-keys';

const itemSchema = z.object({
  stockItemId: z.string().min(1, 'Select an item'),
  quantity:    z.coerce.number().int().positive('Quantity must be a positive whole number'),
  unitCost:    z.coerce.number().positive('Unit cost must be positive'),
});

const schema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  items:      z.array(itemSchema).min(1, 'Add at least one item'),
  notes:      z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

export default function NewPurchaseOrderPage(): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: procurementKeys.suppliers(),
    queryFn: () => api.procurement.listSuppliers(),
    staleTime: 120_000,
  });

  const { data: stockItems } = useQuery({
    queryKey: procurementKeys.stockItems(),
    queryFn: () => api.procurement.listStockItems(),
    staleTime: 120_000,
  });

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ stockItemId: '', quantity: 1, unitCost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = form.watch('items');
  const orderTotal = (watchedItems ?? []).reduce(
    (sum, it) => sum + (Number(it?.quantity) || 0) * (Number(it?.unitCost) || 0),
    0
  );

  const createMutation = useMutation({
    mutationFn: (input: FormInput) => api.procurement.createPurchaseOrder(input),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      const o = order as unknown as Record<string, unknown>;
      toast('Purchase order created.', 'success');
      router.replace(`/procurement/purchase-orders/${String(o['_id'])}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to create purchase order.', 'error');
    },
  });

  function stockItemOf(id: string): Record<string, unknown> | undefined {
    return (stockItems ?? []).find((s) => (s as unknown as Record<string, unknown>)['_id'] === id) as
      | Record<string, unknown>
      | undefined;
  }

  return (
    <div data-page="new-purchase-order">
      <div data-page-header>
        <div>
          <Link href="/procurement/purchase-orders" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Purchase orders</Link>
          <h1>New order</h1>
        </div>
      </div>

      <div data-form-container>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="po-supplier">Supplier</label>
            <select id="po-supplier" {...form.register('supplierId')}>
              <option value="">Select a supplier…</option>
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

          <section data-report-section>
            <h2>Items</h2>
            {fields.map((field, index) => {
              const itemErrors = form.formState.errors.items?.[index];
              const selectedId = watchedItems?.[index]?.stockItemId;
              const selectedItem = selectedId ? stockItemOf(selectedId) : undefined;
              return (
                <div key={field.id} data-form-row data-po-item-row>
                  <div data-form-group>
                    <label htmlFor={`po-item-${index}-stockItemId`}>Stock item</label>
                    <select id={`po-item-${index}-stockItemId`} {...form.register(`items.${index}.stockItemId` as const)}>
                      <option value="">Select item…</option>
                      {(stockItems ?? []).map((s) => {
                        const it = s as unknown as Record<string, unknown>;
                        return (
                          <option key={String(it['_id'])} value={String(it['_id'])}>
                            {String(it['name'] ?? '—')} ({String(it['unit'] ?? '')})
                          </option>
                        );
                      })}
                    </select>
                    <InlineError message={itemErrors?.stockItemId?.message} />
                    {selectedItem && (
                      <p data-field-hint>
                        Current stock: {String(selectedItem['currentQty'] ?? 0)} {String(selectedItem['unit'] ?? '')}
                      </p>
                    )}
                  </div>
                  <div data-form-group>
                    <label htmlFor={`po-item-${index}-quantity`}>Quantity</label>
                    <input
                      id={`po-item-${index}-quantity`}
                      type="number"
                      min={1}
                      {...form.register(`items.${index}.quantity` as const)}
                    />
                    <InlineError message={itemErrors?.quantity?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor={`po-item-${index}-unitCost`}>Unit cost (ZAR)</label>
                    <input
                      id={`po-item-${index}-unitCost`}
                      type="number"
                      min={0}
                      step="0.01"
                      {...form.register(`items.${index}.unitCost` as const)}
                    />
                    <InlineError message={itemErrors?.unitCost?.message} />
                  </div>
                  <div data-form-group>
                    <button
                      type="button"
                      data-btn-ghost
                      data-btn-sm
                      data-destructive
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            {typeof form.formState.errors.items?.message === 'string' && (
              <InlineError message={form.formState.errors.items.message} />
            )}

            <button
              type="button"
              data-btn-ghost
              onClick={() => append({ stockItemId: '', quantity: 1, unitCost: 0 })}
            >
              + Add item
            </button>
          </section>

          <div data-stat-grid>
            <ReadOnlyField label="Order total" value={fmtCurrency(orderTotal)} />
          </div>

          <div data-form-group>
            <label htmlFor="po-notes">Notes <span data-optional>(optional)</span></label>
            <textarea id="po-notes" rows={3} {...form.register('notes')} />
          </div>

          <div data-form-actions>
            <Link href="/procurement/purchase-orders" data-btn-ghost>Cancel</Link>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating order…' : 'Create order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
