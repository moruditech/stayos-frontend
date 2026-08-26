'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Modal, InlineError, Icons } from '@stayos/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { procurementKeys } from '@/lib/query-keys';

const adjustSchema = z.object({
  quantity: z.coerce.number().int('Must be a whole number'),
  reason:   z.string().min(1, 'Reason required'),
});
type AdjustInput = z.infer<typeof adjustSchema>;

const createSchema = z.object({
  name:          z.string().min(1, 'Name required'),
  unit:          z.string().min(1, 'Unit required'),
  currentStock:  z.coerce.number().min(0).default(0),
  reorderLevel:  z.coerce.number().min(0).default(0),
  category:      z.string().optional(),
});
type CreateInput = z.infer<typeof createSchema>;

export default function StockItemsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: procurementKeys.stockItems(),
    queryFn: () => api.procurement.listStockItems(),
    staleTime: 120_000,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['procurement', 'low-stock'],
    queryFn: () => api.procurement.getLowStock(),
    staleTime: 120_000,
  });

  const adjustForm = useForm<AdjustInput>({ resolver: zodResolver(adjustSchema) });
  const createForm = useForm<CreateInput>({ resolver: zodResolver(createSchema), defaultValues: { currentStock: 0, reorderLevel: 0 } });

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
    mutationFn: (input: CreateInput) => api.procurement.createStockItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.stockItems() });
      setShowNew(false); createForm.reset();
      toast('Stock item added.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) createForm.setError(f.field as keyof CreateInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  return (
    <div data-page="stock-items">
      <div data-page-header>
        <div>
          <Link href="/procurement/suppliers" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Procurement</Link>
          <h1>Stock items</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>+ Add item</button>
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
            <tr><th>Name</th><th>Category</th><th>Current stock</th><th>Unit</th><th>Reorder level</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const it = item as unknown as Record<string, unknown>;
              const id = String(it['_id']);
              const current = Number(it['currentStock'] ?? 0);
              const reorder = Number(it['reorderLevel'] ?? 0);
              const isLow = current <= reorder;
              return (
                <tr key={id} data-low-stock={isLow || undefined}>
                  <td>{String(it['name'] ?? '—')}</td>
                  <td>{String(it['category'] ?? '—')}</td>
                  <td data-stock-qty data-low={isLow || undefined}>{current}</td>
                  <td>{String(it['unit'] ?? '—')}</td>
                  <td>{reorder}</td>
                  <td>
                    <button type="button" data-btn-ghost data-btn-sm
                      onClick={() => { setAdjustingId(id); adjustForm.reset(); }}>
                      Adjust
                    </button>
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
            <label htmlFor="adj-qty">Quantity change</label>
            <input id="adj-qty" type="number" placeholder="e.g. -5 to remove, +10 to add" {...adjustForm.register('quantity')} />
            <p data-field-hint>Enter a negative number to remove stock, positive to add.</p>
            <InlineError message={adjustForm.formState.errors.quantity?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="adj-reason">Reason</label>
            <select id="adj-reason" {...adjustForm.register('reason')}>
              <option value="">Select…</option>
              <option value="purchase">New purchase</option>
              <option value="usage">Usage / consumption</option>
              <option value="damaged">Damaged / disposed</option>
              <option value="correction">Stock count correction</option>
              <option value="other">Other</option>
            </select>
            <InlineError message={adjustForm.formState.errors.reason?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setAdjustingId(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Adjusting…' : 'Adjust stock'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add stock item">
        <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="si-name">Item name</label>
            <input id="si-name" type="text" placeholder="e.g. Toilet rolls" {...createForm.register('name')} />
            <InlineError message={createForm.formState.errors.name?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="si-unit">Unit</label>
              <select id="si-unit" {...createForm.register('unit')}>
                <option value="">Select…</option>
                <option value="each">Each</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="litre">Litre</option>
                <option value="kg">Kilogram</option>
              </select>
              <InlineError message={createForm.formState.errors.unit?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="si-cat">Category <span data-optional>(optional)</span></label>
              <select id="si-cat" {...createForm.register('category')}>
                <option value="">Select…</option>
                <option value="cleaning">Cleaning supplies</option>
                <option value="toiletries">Toiletries</option>
                <option value="linen">Linen</option>
                <option value="food_beverage">Food &amp; Beverage</option>
                <option value="maintenance">Maintenance</option>
                <option value="stationery">Stationery</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="si-stock">Current stock</label>
              <input id="si-stock" type="number" min={0} {...createForm.register('currentStock')} />
            </div>
            <div data-form-group>
              <label htmlFor="si-reorder">Reorder level</label>
              <input id="si-reorder" type="number" min={0} {...createForm.register('reorderLevel')} />
              <p data-field-hint>Alert triggers when stock reaches this level.</p>
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
