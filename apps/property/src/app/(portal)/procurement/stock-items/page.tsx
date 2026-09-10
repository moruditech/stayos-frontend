'use client';

import Link from 'next/link';

/**
 * Stock items — Procurement.
 * Field names match the backend `stockItemSchema` / `adjustStockSchema`
 * exactly (src/modules/procurement/procurement.validation.js). Previous
 * versions of this page used different field names (currentStock/
 * reorderLevel/category values that didn't match the backend enum, and
 * {quantity, reason} instead of {type, quantity, reference}) which meant
 * every create/adjust silently 422'd.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, useToast, Modal, InlineError, Icons, Dropdown,
} from '@stayos/ui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { procurementKeys } from '@/lib/query-keys';

const STOCK_CATEGORIES = ['linen', 'cleaning', 'toiletries', 'kitchen', 'office', 'maintenance', 'other'] as const;
const CATEGORY_OPTIONS = STOCK_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

const UNITS = ['each', 'box', 'pack', 'litre', 'kg'] as const;
const UNIT_OPTIONS = UNITS.map((u) => ({ value: u, label: u.charAt(0).toUpperCase() + u.slice(1) }));

const ADJUST_TYPES = ['receive', 'consume', 'adjustment', 'wastage'] as const;
const ADJUST_TYPE_LABELS: Record<(typeof ADJUST_TYPES)[number], string> = {
  receive:    'Receive stock (newly purchased / delivered)',
  consume:    'Usage / consumption',
  wastage:    'Damaged / disposed',
  adjustment: 'Stock count correction',
};
const ADJUST_TYPE_OPTIONS = ADJUST_TYPES.map((t) => ({ value: t, label: ADJUST_TYPE_LABELS[t] }));

const adjustSchema = z.object({
  type:      z.enum(ADJUST_TYPES, { errorMap: () => ({ message: 'Select a reason' }) }),
  quantity:  z.coerce.number().positive('Must be a positive number'),
  reference: z.string().optional(),
});
type AdjustInput = z.infer<typeof adjustSchema>;

// Blank number inputs arrive as '' — z.coerce.number() turns that into 0,
// which then fails .positive()/.min() checks even though the field is
// meant to be optional. Strip blanks to undefined before coercing.
const blankToUndefined = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);
const optionalPositiveInt = z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional());
const optionalPositiveNum = z.preprocess(blankToUndefined, z.coerce.number().positive().optional());

const itemSchema = z.object({
  name:        z.string().min(1, 'Name required'),
  category:    z.enum(STOCK_CATEGORIES, { errorMap: () => ({ message: 'Category required' }) }),
  unit:        z.string().min(1, 'Unit required'),
  parLevel:    z.coerce.number().int().min(0, 'Par level must be zero or positive'),
  currentQty:  z.coerce.number().min(0).default(0),
  costPerUnit: optionalPositiveNum,
  preferredSupplierId: z.preprocess(blankToUndefined, z.string().optional()),
  autoRestockEnabled:  z.boolean().default(true),
  reorderQuantity:     optionalPositiveInt,
});
type ItemInput = z.infer<typeof itemSchema>;

export default function StockItemsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: procurementKeys.stockItems(),
    queryFn: () => api.procurement.listStockItems(),
    staleTime: 120_000,
  });

  const { data: suppliers } = useQuery({
    queryKey: procurementKeys.suppliers(),
    queryFn: () => api.procurement.listSuppliers(),
    staleTime: 120_000,
  });
  const supplierOptions = [
    { value: '', label: 'No preferred supplier' },
    ...(suppliers ?? []).map((s) => {
      const sup = s as unknown as Record<string, unknown>;
      return { value: String(sup['_id']), label: String(sup['name'] ?? '—') };
    }),
  ];

  const { data: lowStock } = useQuery({
    queryKey: ['procurement', 'low-stock'],
    queryFn: () => api.procurement.getLowStock(),
    staleTime: 120_000,
  });

  const adjustForm = useForm<AdjustInput>({ resolver: zodResolver(adjustSchema) });
  const itemForm = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: { currentQty: 0, parLevel: 0, autoRestockEnabled: true },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustInput }) =>
      api.procurement.adjustStock(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.stockItems() });
      void queryClient.invalidateQueries({ queryKey: ['procurement', 'low-stock'] });
      setAdjustingId(null); adjustForm.reset();
      toast('Stock adjusted.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) adjustForm.setError(f.field as keyof AdjustInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: ItemInput) => api.procurement.createStockItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.stockItems() });
      setShowNew(false); itemForm.reset({ currentQty: 0, parLevel: 0, autoRestockEnabled: true });
      toast('Stock item added.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyItemErrors(err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ItemInput }) => api.procurement.updateStockItem(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.stockItems() });
      setEditingId(null); itemForm.reset({ currentQty: 0, parLevel: 0, autoRestockEnabled: true });
      toast('Stock item updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyItemErrors(err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  function applyItemErrors(err: ApiError): void {
    for (const f of err.fields ?? []) itemForm.setError(f.field as keyof ItemInput, { message: f.message });
  }

  function openEdit(item: Record<string, unknown>): void {
    const supplierField = item['preferredSupplierId'];
    const supplierId = supplierField && typeof supplierField === 'object'
      ? String((supplierField as Record<string, unknown>)['_id'] ?? '')
      : String(supplierField ?? '');
    itemForm.reset({
      name:        String(item['name'] ?? ''),
      category:    item['category'] as ItemInput['category'],
      unit:        String(item['unit'] ?? ''),
      parLevel:    Number(item['parLevel'] ?? 0),
      currentQty:  Number(item['currentQty'] ?? 0),
      costPerUnit: item['costPerUnit'] != null ? Number(item['costPerUnit']) : undefined,
      preferredSupplierId: supplierId || undefined,
      autoRestockEnabled: item['autoRestockEnabled'] !== false,
      reorderQuantity: item['reorderQuantity'] != null ? Number(item['reorderQuantity']) : undefined,
    });
    setEditingId(String(item['_id']));
  }

  const lowStockIds = new Set(((lowStock as unknown[]) ?? []).map((i) => String((i as Record<string, unknown>)['_id'])));

  return (
    <div data-page="stock-items">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>Stock items</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => {
          itemForm.reset({ currentQty: 0, parLevel: 0, autoRestockEnabled: true });
          setShowNew(true);
        }}>+ Add item</button>
      </div>

      {(lowStock as unknown[])?.length > 0 && (
        <div role="alert" data-alert data-alert-warning>
          <strong>{(lowStock as unknown[]).length} item{(lowStock as unknown[]).length !== 1 ? 's' : ''} below reorder level.</strong>
        </div>
      )}

      {isLoading ? <SkeletonLoader rows={5} /> : !items?.length ? (
        <EmptyState
          title="No stock items"
          description="Add items to track your property's consumables and supplies."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Add first item</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Current stock</th><th>Unit</th><th>Par level</th><th>Supplier</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const it = item as unknown as Record<string, unknown>;
              const id = String(it['_id']);
              const current = Number(it['currentQty'] ?? 0);
              const par = Number(it['parLevel'] ?? 0);
              const isLow = lowStockIds.has(id) || current <= par;
              const supplierField = it['preferredSupplierId'];
              const supplierName = supplierField && typeof supplierField === 'object'
                ? String((supplierField as Record<string, unknown>)['name'] ?? '—')
                : '—';
              const category = String(it['category'] ?? '—');
              return (
                <tr key={id} data-low-stock={isLow || undefined}>
                  <td>{String(it['name'] ?? '—')}</td>
                  <td>{category === '—' ? category : category.charAt(0).toUpperCase() + category.slice(1)}</td>
                  <td data-stock-qty data-low={isLow || undefined}>{current}</td>
                  <td>{String(it['unit'] ?? '—')}</td>
                  <td>{par}</td>
                  <td>{supplierName}</td>
                  <td>
                    <div data-action-cluster>
                      <button type="button" data-btn-ghost data-btn-sm
                        onClick={() => { setAdjustingId(id); adjustForm.reset(); }}>
                        Adjust
                      </button>
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => openEdit(it)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={!!adjustingId} onClose={() => setAdjustingId(null)} title="Adjust stock">
        <form onSubmit={adjustForm.handleSubmit((v) => adjustMutation.mutate({ id: adjustingId!, input: v }))}
          noValidate data-form>
          <div data-form-group>
            <label htmlFor="adj-type">Reason</label>
            <Controller
              control={adjustForm.control}
              name="type"
              render={({ field }) => (
                <Dropdown id="adj-type" options={ADJUST_TYPE_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select…" />
              )}
            />
            <p data-field-hint>Use &quot;Receive stock&quot; to add newly delivered items — including partial or unexpected deliveries not tied to a purchase order.</p>
            <InlineError message={adjustForm.formState.errors.type?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="adj-qty">Quantity</label>
            <input id="adj-qty" type="number" min={0} step="1" placeholder="e.g. 10" {...adjustForm.register('quantity')} />
            <p data-field-hint>Always a positive number — the reason above determines whether it adds or removes stock.</p>
            <InlineError message={adjustForm.formState.errors.quantity?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="adj-ref">Reference <span data-optional>(optional)</span></label>
            <input id="adj-ref" type="text" placeholder="e.g. delivery note number" {...adjustForm.register('reference')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setAdjustingId(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Adjusting…' : 'Adjust stock'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showNew || !!editingId}
        onClose={() => { setShowNew(false); setEditingId(null); }}
        title={editingId ? 'Edit stock item' : 'Add stock item'}
      >
        <form
          onSubmit={itemForm.handleSubmit((v) => {
            if (editingId) updateMutation.mutate({ id: editingId, input: v });
            else createMutation.mutate(v);
          })}
          noValidate data-form
        >
          <div data-form-group>
            <label htmlFor="si-name">Item name</label>
            <input id="si-name" type="text" placeholder="e.g. Toilet rolls" {...itemForm.register('name')} />
            <InlineError message={itemForm.formState.errors.name?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="si-unit">Unit</label>
              <Controller
                control={itemForm.control}
                name="unit"
                render={({ field }) => (
                  <Dropdown id="si-unit" options={UNIT_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select…" />
                )}
              />
              <InlineError message={itemForm.formState.errors.unit?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="si-cat">Category</label>
              <Controller
                control={itemForm.control}
                name="category"
                render={({ field }) => (
                  <Dropdown id="si-cat" options={CATEGORY_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select…" />
                )}
              />
              <InlineError message={itemForm.formState.errors.category?.message} />
            </div>
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="si-stock">Current stock</label>
              <input id="si-stock" type="number" min={0} {...itemForm.register('currentQty')} />
            </div>
            <div data-form-group>
              <label htmlFor="si-par">Par level</label>
              <input id="si-par" type="number" min={0} {...itemForm.register('parLevel')} />
              <p data-field-hint>Low-stock alert (and auto-restock, if enabled) triggers at or below this level.</p>
              <InlineError message={itemForm.formState.errors.parLevel?.message} />
            </div>
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="si-cost">Cost per unit (ZAR) <span data-optional>(optional)</span></label>
              <input id="si-cost" type="number" min={0} step="0.01" {...itemForm.register('costPerUnit')} />
            </div>
            <div data-form-group>
              <label htmlFor="si-supplier">Preferred supplier <span data-optional>(optional)</span></label>
              <Controller
                control={itemForm.control}
                name="preferredSupplierId"
                render={({ field }) => (
                  <Dropdown
                    id="si-supplier"
                    options={supplierOptions}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="No preferred supplier"
                  />
                )}
              />
            </div>
          </div>
          <div data-form-row>
            <div data-form-group data-checkbox-group>
              <label data-checkbox-label>
                <input type="checkbox" {...itemForm.register('autoRestockEnabled')} />
                Include this item in auto-restock
              </label>
              <p data-field-hint>Turn off to exclude just this item, even if its supplier has auto-restock configured.</p>
            </div>
            <div data-form-group>
              <label htmlFor="si-reorder-qty">Reorder quantity <span data-optional>(optional)</span></label>
              <input id="si-reorder-qty" type="number" min={1} placeholder="Default: top up to 2x par level" {...itemForm.register('reorderQuantity')} />
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowNew(false); setEditingId(null); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving…'
                : editingId ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
