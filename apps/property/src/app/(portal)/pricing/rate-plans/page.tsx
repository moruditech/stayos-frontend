'use client';

import Link from 'next/link';

/**
 * Rate plans — Pricing & Revenue.
 *
 * Field names match RatePlan.model.js / pricing.validation.js exactly. The
 * previous version of this form posted an entirely different shape
 * (ratePerNight/description/isDefault — none of which exist on the model)
 * which crashed the backend on every submit: pricing.service.js#createRatePlan
 * calls `data.code.toUpperCase()`, and code was always undefined, throwing
 * an unhandled TypeError that the global error handler reports as "An
 * unexpected error occurred." The backend now also validates this properly
 * (previously there was no validation at all on this route) so a real
 * mistake shows a clear field error instead of a crash.
 */

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, RATE_PLAN_TYPES } from '@stayos/api-client';
import type { ApiError, RatePlan } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, useToast, Modal, InlineError, ConfirmDialog,
  Dropdown, MultiSelectDropdown, StatusBadge,
} from '@stayos/ui';
import { pricingKeys } from '@/lib/query-keys';

const ROOM_TYPES = ['single', 'double', 'twin', 'triple', 'suite', 'dormitory', 'apartment', 'studio'] as const;
const ROOM_TYPE_OPTIONS = ROOM_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));

const TYPE_LABELS: Record<(typeof RATE_PLAN_TYPES)[number], string> = {
  standard: 'Standard', non_refundable: 'Non-refundable', advance_purchase: 'Advance purchase',
  corporate: 'Corporate', seasonal: 'Seasonal', last_minute: 'Last-minute',
  weekly: 'Weekly', monthly: 'Monthly', promotional: 'Promotional',
};
const TYPE_OPTIONS = RATE_PLAN_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }));

const blankToUndefined = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);
const optionalNum = z.preprocess(blankToUndefined, z.coerce.number().optional());

const planSchema = z.object({
  name:                     z.string().min(1, 'Name is required'),
  code:                     z.string().min(1, 'Code is required').max(20),
  type:                     z.enum(RATE_PLAN_TYPES, { errorMap: () => ({ message: 'Type is required' }) }),
  baseModifierPercent:      z.coerce.number().default(0),
  minNights:                z.coerce.number().int().min(1).default(1),
  maxNights:                optionalNum,
  advanceBookingDays:       z.coerce.number().int().min(0).default(0),
  isRefundable:             z.boolean().default(true),
  cancellationPolicyHours:  z.coerce.number().min(0).default(72),
  applicableRoomTypes:      z.array(z.string()).default([]),
  applicableRoomIds:        z.array(z.string()).default([]),
  validFrom:                z.string().optional(),
  validTo:                  z.string().optional(),
  floorPrice:               optionalNum,
  ceilingPrice:             optionalNum,
  isActive:                 z.boolean().optional(),
}).refine(
  (d) => d.floorPrice == null || d.ceilingPrice == null || d.floorPrice <= d.ceilingPrice,
  { message: 'Floor price cannot be greater than ceiling price', path: ['floorPrice'] }
);
type PlanInput = z.infer<typeof planSchema>;

function describeApplicability(plan: RatePlan, roomsById: Map<string, string>): string {
  if (plan.applicableRoomIds?.length) {
    const names = plan.applicableRoomIds.map((id) => roomsById.get(id) ?? id);
    return `${names.length} specific room${names.length !== 1 ? 's' : ''}: ${names.join(', ')}`;
  }
  if (plan.applicableRoomTypes?.length) {
    return `Room types: ${plan.applicableRoomTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`;
  }
  return 'All rooms';
}

export default function RatePlansPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);
  const [cloneId, setCloneId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: pricingKeys.ratePlans(),
    queryFn: () => api.pricing.listRatePlans(),
    staleTime: 60_000,
  });

  // Full plan docs aren't in the list response — fetch each plan's detail
  // for card display (room targeting, floor/ceiling) and for the edit form.
  const planIds = (plans ?? []).map((p) => p._id);
  const { data: fullPlans } = useQuery({
    queryKey: [...pricingKeys.ratePlans(), 'full', planIds],
    queryFn: async () => {
      const results = await Promise.all(planIds.map((id) => api.pricing.getRatePlan(id)));
      return results;
    },
    enabled: planIds.length > 0,
    staleTime: 60_000,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms', 'list'],
    queryFn: () => api.rooms.list(),
    staleTime: 120_000,
  });
  const roomOptions = (rooms ?? []).map((r) => ({ value: r._id, label: `${r.roomNumber} (${r.type})` }));
  const roomsById = new Map((rooms ?? []).map((r) => [r._id, r.roomNumber]));

  const form = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      baseModifierPercent: 0, minNights: 1, advanceBookingDays: 0,
      isRefundable: true, cancellationPolicyHours: 72,
      applicableRoomTypes: [], applicableRoomIds: [],
    },
  });

  useEffect(() => {
    if (!editingPlan) return;
    form.reset({
      name: editingPlan.name, code: editingPlan.code, type: editingPlan.type,
      baseModifierPercent: editingPlan.baseModifierPercent, minNights: editingPlan.minNights,
      maxNights: editingPlan.maxNights, advanceBookingDays: editingPlan.advanceBookingDays,
      isRefundable: editingPlan.isRefundable, cancellationPolicyHours: editingPlan.cancellationPolicyHours,
      applicableRoomTypes: editingPlan.applicableRoomTypes ?? [],
      applicableRoomIds: editingPlan.applicableRoomIds ?? [],
      validFrom: editingPlan.validFrom?.slice(0, 10), validTo: editingPlan.validTo?.slice(0, 10),
      floorPrice: editingPlan.floorPrice, ceilingPrice: editingPlan.ceilingPrice,
      isActive: editingPlan.isActive,
    });
  }, [editingPlan]);

  function openCreate(): void {
    form.reset({
      name: '', code: '', baseModifierPercent: 0, minNights: 1, advanceBookingDays: 0,
      isRefundable: true, cancellationPolicyHours: 72, applicableRoomTypes: [], applicableRoomIds: [],
    });
    setEditingPlan(null);
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: (input: PlanInput) => api.pricing.createRatePlan(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.ratePlans() });
      setShowForm(false); form.reset();
      toast('Rate plan created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'DUPLICATE') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof PlanInput, { message: f.message });
        if (!err.fields?.length) form.setError('code', { message: err.message });
      } else toast(err.message ?? 'Failed to create rate plan.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PlanInput }) => api.pricing.updateRatePlan(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.ratePlans() });
      setShowForm(false); setEditingPlan(null); form.reset();
      toast('Rate plan updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'DUPLICATE') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof PlanInput, { message: f.message });
      } else toast(err.message ?? 'Failed to update rate plan.', 'error');
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
      toast('Rate plan deactivated.', 'success');
    },
    onError: (err: ApiError) => { setDeleteId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <div data-page="rate-plans">
      <div data-page-header>
        <h1>Pricing &amp; Revenue</h1>
        <div data-header-actions>
          <Link href="/pricing/dynamic-rules" data-btn-ghost>Dynamic rules</Link>
          <button type="button" data-btn-primary onClick={openCreate}>+ New rate plan</button>
        </div>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !plans?.length ? (
        <EmptyState
          title="No rate plans"
          description="Create rate plans to control how rooms are priced."
          action={<button type="button" data-btn-primary onClick={openCreate}>Create first plan</button>}
        />
      ) : (
        <div data-rate-plan-grid>
          {(fullPlans ?? plans).map((plan) => {
            const p = plan as RatePlan;
            const modifier = p.baseModifierPercent;
            return (
              <div key={p._id} data-rate-plan-card data-inactive={!p.isActive || undefined}>
                <div data-plan-header>
                  <h2 data-plan-name>{p.name}</h2>
                  <StatusBadge status={p.isActive ? 'active' : 'inactive'} />
                </div>
                <p data-plan-meta><span data-plan-code>{p.code}</span> · {TYPE_LABELS[p.type] ?? p.type}</p>
                <div data-plan-rate>
                  <span data-rate-amount>
                    {modifier === 0 ? 'No adjustment' : `${modifier > 0 ? '+' : ''}${modifier}%`}
                  </span>
                  <span data-rate-period>vs room base rate</span>
                </div>
                <div data-plan-meta>
                  <span>Min {p.minNights} night{p.minNights !== 1 ? 's' : ''}</span>
                  {Boolean(p.maxNights) && <span> · Max {p.maxNights} nights</span>}
                </div>
                <p data-field-hint>{describeApplicability(p, roomsById)}</p>
                {(p.floorPrice != null || p.ceilingPrice != null) && (
                  <p data-field-hint>
                    {p.floorPrice != null && `Floor R${p.floorPrice}`}
                    {p.floorPrice != null && p.ceilingPrice != null && ' · '}
                    {p.ceilingPrice != null && `Ceiling R${p.ceilingPrice}`}
                  </p>
                )}
                {Boolean(p.pricingRules?.length) && (
                  <p data-field-hint>{p.pricingRules.length} dynamic rule{p.pricingRules.length !== 1 ? 's' : ''}</p>
                )}
                <div data-plan-actions>
                  <button type="button" data-btn-ghost data-btn-sm onClick={() => { setEditingPlan(p); setShowForm(true); }}>
                    Edit
                  </button>
                  <button type="button" data-btn-ghost data-btn-sm onClick={() => setCloneId(p._id)}>
                    Duplicate
                  </button>
                  {p.isActive && (
                    <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => setDeleteId(p._id)}>
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingPlan(null); }}
        title={editingPlan ? `Edit ${editingPlan.name}` : 'New rate plan'}
      >
        <form
          onSubmit={form.handleSubmit((v) => {
            if (editingPlan) updateMutation.mutate({ id: editingPlan._id, input: v });
            else createMutation.mutate(v);
          })}
          noValidate data-form
        >
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="rp-name">Plan name</label>
              <input id="rp-name" type="text" placeholder="e.g. Best Available Rate" {...form.register('name')} />
              <InlineError message={form.formState.errors.name?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="rp-code">Code</label>
              <input id="rp-code" type="text" placeholder="e.g. BAR" {...form.register('code')} />
              <p data-field-hint>Stored in caps automatically, must be unique.</p>
              <InlineError message={form.formState.errors.code?.message} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="rp-type">Type</label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Dropdown id="rp-type" options={TYPE_OPTIONS} value={field.value ?? ''} onChange={field.onChange} placeholder="Select…" />
              )}
            />
            <InlineError message={form.formState.errors.type?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="rp-modifier">Rate adjustment (%)</label>
            <input id="rp-modifier" type="number" step="0.1" {...form.register('baseModifierPercent')} />
            <p data-field-hint>Applied on top of each room&apos;s base rate — negative for a discount, positive for a surcharge.</p>
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
            <div data-form-group>
              <label htmlFor="rp-advance">Advance booking days</label>
              <input id="rp-advance" type="number" min={0} {...form.register('advanceBookingDays')} />
            </div>
          </div>

          <div data-form-row>
            <div data-form-group data-checkbox-group>
              <label data-checkbox-label>
                <input type="checkbox" {...form.register('isRefundable')} />
                Refundable
              </label>
            </div>
            <div data-form-group>
              <label htmlFor="rp-cancel">Free cancellation until (hours before)</label>
              <input id="rp-cancel" type="number" min={0} {...form.register('cancellationPolicyHours')} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="rp-room-types">Applies to room types <span data-optional>(optional)</span></label>
            <Controller
              control={form.control}
              name="applicableRoomTypes"
              render={({ field }) => (
                <MultiSelectDropdown
                  id="rp-room-types"
                  options={ROOM_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="All room types"
                />
              )}
            />
          </div>

          <div data-form-group>
            <label htmlFor="rp-room-ids">Applies to specific rooms <span data-optional>(optional)</span></label>
            <Controller
              control={form.control}
              name="applicableRoomIds"
              render={({ field }) => (
                <MultiSelectDropdown
                  id="rp-room-ids"
                  options={roomOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="All rooms of the selected type(s)"
                />
              )}
            />
            <p data-field-hint>If you pick specific rooms here, they override the room types above — this plan will only apply to these exact rooms.</p>
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="rp-valid-from">Valid from <span data-optional>(optional)</span></label>
              <input id="rp-valid-from" type="date" {...form.register('validFrom')} />
            </div>
            <div data-form-group>
              <label htmlFor="rp-valid-to">Valid to <span data-optional>(optional)</span></label>
              <input id="rp-valid-to" type="date" {...form.register('validTo')} />
            </div>
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="rp-floor">Floor price <span data-optional>(optional)</span></label>
              <input id="rp-floor" type="number" min={0} step="0.01" {...form.register('floorPrice')} />
              <p data-field-hint>Dynamic pricing rules won&apos;t push the rate below this.</p>
            </div>
            <div data-form-group>
              <label htmlFor="rp-ceiling">Ceiling price <span data-optional>(optional)</span></label>
              <input id="rp-ceiling" type="number" min={0} step="0.01" {...form.register('ceilingPrice')} />
              <p data-field-hint>...or above this.</p>
            </div>
          </div>
          <InlineError message={form.formState.errors.floorPrice?.message} />

          {editingPlan && (
            <div data-form-group data-checkbox-group>
              <label data-checkbox-label>
                <input type="checkbox" {...form.register('isActive')} />
                Active
              </label>
            </div>
          )}

          {editingPlan && (
            <p data-field-hint>
              Configure occupancy, lead-time, length-of-stay, and day-of-week dynamic pricing rules
              from the <Link href="/pricing/dynamic-rules">Dynamic rules</Link> screen.
            </p>
          )}

          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowForm(false); setEditingPlan(null); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving…'
                : editingPlan ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!cloneId}
        title="Duplicate this rate plan?"
        message="A copy of this plan will be created (inactive by default). You can then edit the copy."
        confirmLabel="Duplicate"
        cancelLabel="Cancel"
        onConfirm={() => { if (cloneId) cloneMutation.mutate(cloneId); }}
        onCancel={() => setCloneId(null)}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Deactivate this rate plan?"
        message="This plan will stop applying to new rate calculations. Bookings already made against it are not affected. You can reactivate it later by editing it."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
