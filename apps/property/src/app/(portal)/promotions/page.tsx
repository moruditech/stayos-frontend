'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, ConfirmDialog } from '@stayos/ui';
import { promotionKeys } from '@/lib/query-keys';

const promoSchema = z.object({
  code:             z.string().min(2, 'Code is required').toUpperCase(),
  description:      z.string().optional(),
  discountType:     z.enum(['percentage', 'fixed']),
  discountValue:    z.coerce.number().min(0.01, 'Discount value required'),
  validFrom:        z.string().min(1, 'Start date required'),
  validUntil:       z.string().min(1, 'End date required'),
  maxUses:          z.coerce.number().optional(),
  minNights:        z.coerce.number().optional(),
});
type PromoInput = z.infer<typeof promoSchema>;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PromotionsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: promotions, isLoading } = useQuery({
    queryKey: promotionKeys.list(),
    queryFn: () => api.promotions.list(),
    staleTime: 120_000,
  });

  const form = useForm<PromoInput>({
    resolver: zodResolver(promoSchema),
    defaultValues: { discountType: 'percentage' },
  });

  const discountType = form.watch('discountType');

  const createMutation = useMutation({
    mutationFn: (input: PromoInput) => api.promotions.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.list() });
      setShowNew(false); form.reset();
      toast('Promotion created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof PromoInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.promotions.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.list() });
      setDeleteId(null);
      toast('Promotion deleted.', 'success');
    },
    onError: (err: ApiError) => { setDeleteId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <div data-page="promotions">
      <div data-page-header>
        <h1>Promotions</h1>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>+ New promotion</button>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !promotions?.length ? (
        <EmptyState
          title="No promotions"
          description="Create promo codes to offer discounts to guests."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Create first promotion</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Valid from</th>
              <th>Valid until</th>
              <th>Uses</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => {
              const p = promo as unknown as Record<string, unknown>;
              const id = String(p['_id']);
              const discountValue = Number(p['discountValue'] ?? 0);
              const discountDisplay = p['discountType'] === 'percentage'
                ? `${discountValue}%`
                : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(discountValue);
              const usedCount = Number(p['usedCount'] ?? 0);
              const maxUses = p['maxUses'] ? Number(p['maxUses']) : null;
              return (
                <tr key={id}>
                  <td><code data-promo-code>{String(p['code'] ?? '—')}</code></td>
                  <td>{discountDisplay}</td>
                  <td>{p['validFrom'] ? fmtDate(String(p['validFrom'])) : '—'}</td>
                  <td>{p['validUntil'] ? fmtDate(String(p['validUntil'])) : '—'}</td>
                  <td>{maxUses ? `${usedCount} / ${maxUses}` : String(usedCount)}</td>
                  <td><StatusBadge status={String(p['status'] ?? 'active')} /></td>
                  <td>
                    <div data-action-cluster>
                      <a href={`/promotions/${id}/usage`} data-btn-ghost data-btn-sm>Usage</a>
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

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New promotion">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="pr-code">Promo code</label>
            <input id="pr-code" type="text" placeholder="e.g. SUMMER20" {...form.register('code')}
              style={{ textTransform: 'uppercase' }} />
            <InlineError message={form.formState.errors.code?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="pr-desc">Description <span data-optional>(optional)</span></label>
            <input id="pr-desc" type="text" {...form.register('description')} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="pr-type">Discount type</label>
              <select id="pr-type" {...form.register('discountType')}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (ZAR)</option>
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="pr-value">
                {discountType === 'percentage' ? 'Discount %' : 'Discount amount (ZAR)'}
              </label>
              <input id="pr-value" type="number" min={0} step="0.01" {...form.register('discountValue')} />
              <InlineError message={form.formState.errors.discountValue?.message} />
            </div>
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="pr-from">Valid from</label>
              <input id="pr-from" type="date" {...form.register('validFrom')} />
              <InlineError message={form.formState.errors.validFrom?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="pr-until">Valid until</label>
              <input id="pr-until" type="date" {...form.register('validUntil')} />
              <InlineError message={form.formState.errors.validUntil?.message} />
            </div>
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="pr-max">Max uses <span data-optional>(optional)</span></label>
              <input id="pr-max" type="number" min={1} {...form.register('maxUses')} />
            </div>
            <div data-form-group>
              <label htmlFor="pr-minnights">Min nights <span data-optional>(optional)</span></label>
              <input id="pr-minnights" type="number" min={1} {...form.register('minNights')} />
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create promotion'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this promotion?"
        message="Guests who already used this code are not affected. Pending bookings using this code will remain valid."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
