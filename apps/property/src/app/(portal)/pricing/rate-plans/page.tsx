'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Modal, InlineError, ConfirmDialog } from '@stayos/ui';
import { pricingKeys } from '@/lib/query-keys';

const planSchema = z.object({
  name:         z.string().min(1, 'Name is required'),
  description:  z.string().optional(),
  ratePerNight: z.coerce.number().min(0, 'Rate must be positive'),
  minNights:    z.coerce.number().min(1).default(1),
  maxNights:    z.coerce.number().optional(),
  isDefault:    z.boolean().default(false),
});
type PlanInput = z.infer<typeof planSchema>;

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

export default function RatePlansPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [cloneId, setCloneId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: pricingKeys.ratePlans(),
    queryFn: () => api.pricing.listRatePlans(),
    staleTime: 120_000,
  });

  const form = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: { minNights: 1, isDefault: false },
  });

  const createMutation = useMutation({
    mutationFn: (input: PlanInput) => api.pricing.createRatePlan(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.ratePlans() });
      setShowNew(false); form.reset();
      toast('Rate plan created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof PlanInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => api.pricing.cloneRatePlan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.ratePlans() });
      setCloneId(null);
      toast('Rate plan duplicated.', 'success');
    },
    onError: (err: ApiError) => { setCloneId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.pricing.deleteRatePlan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.ratePlans() });
      setDeleteId(null);
      toast('Rate plan deleted.', 'success');
    },
    onError: (err: ApiError) => { setDeleteId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <div data-page="rate-plans">
      <div data-page-header>
        <h1>Pricing &amp; Revenue</h1>
        <div data-header-actions>
          <Link href="/pricing/dynamic-rules" data-btn-ghost>Dynamic rules</Link>
          <button type="button" data-btn-primary onClick={() => setShowNew(true)}>+ New rate plan</button>
        </div>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !plans?.length ? (
        <EmptyState
          title="No rate plans"
          description="Create rate plans to control how rooms are priced."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Create first plan</button>}
        />
      ) : (
        <div data-rate-plan-grid>
          {plans.map((plan) => {
            const p = plan as unknown as Record<string, unknown>;
            const id = String(p['_id']);
            return (
              <div key={id} data-rate-plan-card data-default={Boolean(p['isDefault']) || undefined}>
                {Boolean(p['isDefault']) && <span data-default-badge>Default</span>}
                <h2 data-plan-name>{String(p['name'] ?? '—')}</h2>
                {Boolean(p['description']) && <p data-plan-desc>{String(p['description'])}</p>}
                <div data-plan-rate>
                  <span data-rate-amount>{p['ratePerNight'] != null ? fmtCurrency(Number(p['ratePerNight'])) : '—'}</span>
                  <span data-rate-period>per night</span>
                </div>
                <div data-plan-meta>
                  {Boolean(p['minNights']) && <span>Min {String(p['minNights'])} night{Number(p['minNights']) !== 1 ? 's' : ''}</span>}
                  {Boolean(p['maxNights']) && <span> · Max {String(p['maxNights'])} nights</span>}
                </div>
                <div data-plan-actions>
                  <button type="button" data-btn-ghost data-btn-sm onClick={() => setCloneId(id)}>
                    Duplicate
                  </button>
                  {!p['isDefault'] && (
                    <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => setDeleteId(id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New rate plan">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="rp-name">Plan name</label>
            <input id="rp-name" type="text" placeholder="e.g. Best Available Rate" {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="rp-desc">Description <span data-optional>(optional)</span></label>
            <input id="rp-desc" type="text" {...form.register('description')} />
          </div>
          <div data-form-group>
            <label htmlFor="rp-rate">Rate per night (ZAR)</label>
            <input id="rp-rate" type="number" min={0} step="0.01" {...form.register('ratePerNight')} />
            <InlineError message={form.formState.errors.ratePerNight?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="rp-min">Min nights</label>
              <input id="rp-min" type="number" min={1} {...form.register('minNights')} />
            </div>
            <div data-form-group>
              <label htmlFor="rp-max">Max nights <span data-optional>(optional)</span></label>
              <input id="rp-max" type="number" min={1} {...form.register('maxNights')} />
            </div>
          </div>
          <div data-form-group data-checkbox-group>
            <label data-checkbox-label>
              <input type="checkbox" {...form.register('isDefault')} />
              Set as default rate plan
            </label>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create plan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!cloneId}
        title="Duplicate this rate plan?"
        message="A copy of this plan will be created. You can then edit the copy."
        confirmLabel="Duplicate"
        cancelLabel="Cancel"
        onConfirm={() => { if (cloneId) cloneMutation.mutate(cloneId); }}
        onCancel={() => setCloneId(null)}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Delete this rate plan?"
        message="This cannot be undone. Bookings already made against this plan are not affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
