'use client';

import Link from 'next/link';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError, Promotion, Room } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, ConfirmDialog, applyServerErrors,
} from '@stayos/ui';
import { promotionKeys, roomKeys } from '@/lib/query-keys';

// Must match the backend createPromotionSchema exactly
// (src/modules/promotions/promotions.validation.js) — field names here are
// what applyServerErrors maps 422 responses onto.
const DISCOUNT_TYPES = ['percentage', 'fixed_amount', 'free_night'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const promoSchema = z.object({
  code:            z.string().min(2, 'Code is required').toUpperCase(),
  description:     z.string().optional(),
  type:            z.enum(DISCOUNT_TYPES),
  value:           z.coerce.number().positive('Value must be a positive number'),
  minBookingValue: z.coerce.number().min(0).optional(),
  validFrom:       z.string().min(1, 'Start date required'),
  validTo:         z.string().min(1, 'End date required'),
  maxUses:         z.coerce.number().int().positive().optional(),
});
type PromoInput = z.infer<typeof promoSchema>;

const DISCOUNT_TYPE_LABELS: Record<(typeof DISCOUNT_TYPES)[number], string> = {
  percentage:   'Percentage (%)',
  fixed_amount: 'Fixed amount (ZAR)',
  free_night:   'Free night',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function fmtDiscount(promo: Promotion): string {
  if (promo.type === 'percentage') return `${promo.value}%`;
  const suffix = promo.type === 'free_night' ? ' (free night)' : '';
  return `${fmtZAR(promo.value)}${suffix}`;
}

function fmtDays(daysOfWeek?: number[]): string {
  if (!daysOfWeek?.length) return 'Every day';
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Weekdays';
  if (sorted.length === 2 && sorted.join(',') === '0,6') return 'Weekend';
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

function fmtRooms(promo: Promotion, roomsById: Map<string, Room>): string {
  const ids = promo.applicableRoomIds;
  if (!ids?.length) return 'All rooms';
  if (ids.length === 1) {
    const room = roomsById.get(ids[0] ?? '');
    return room ? `Room ${room.roomNumber}` : '1 room';
  }
  return `${ids.length} rooms`;
}

export default function PromotionsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [roomScope, setRoomScope] = useState<'all' | 'specific'>('all');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

  const { data: promotions, isLoading } = useQuery({
    queryKey: promotionKeys.list(),
    queryFn: () => api.promotions.list(),
    staleTime: 120_000,
  });

  // Fetched unconditionally (not just while the modal is open) — the table
  // also needs it to resolve room numbers for promotions already linked to
  // specific rooms.
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: roomKeys.list({ limit: 100 }),
    queryFn: () => api.rooms.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const roomsById = useMemo(
    () => new Map((rooms ?? []).map((r) => [r._id, r])),
    [rooms]
  );

  const form = useForm<PromoInput>({
    resolver: zodResolver(promoSchema),
    defaultValues: { type: 'percentage' },
  });

  const type = form.watch('type');

  function resetModal(): void {
    form.reset({ type: 'percentage' });
    setRoomScope('all');
    setSelectedRoomIds([]);
    setDaysOfWeek([]);
  }

  function toggleRoom(id: string): void {
    setSelectedRoomIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function toggleDay(day: number): void {
    setDaysOfWeek((prev) => (
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    ));
  }

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.promotions.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.list() });
      setShowNew(false);
      resetModal();
      toast('Promotion created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to create promotion.', 'error');
      }
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

  function onSubmit(values: PromoInput): void {
    if (roomScope === 'specific' && selectedRoomIds.length === 0) {
      toast('Select at least one room, or choose "All rooms".', 'error');
      return;
    }
    createMutation.mutate({
      ...values,
      applicableRoomIds: roomScope === 'specific' ? selectedRoomIds : [],
      daysOfWeek,
    });
  }

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
              <th>Rooms</th>
              <th>Days</th>
              <th>Valid from</th>
              <th>Valid until</th>
              <th>Uses</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo._id}>
                <td><code data-promo-code>{promo.code}</code></td>
                <td>{fmtDiscount(promo)}</td>
                <td>{fmtRooms(promo, roomsById)}</td>
                <td>{fmtDays(promo.daysOfWeek)}</td>
                <td>{fmtDate(promo.validFrom)}</td>
                <td>{fmtDate(promo.validTo)}</td>
                <td>{promo.maxUses ? `${promo.usedCount} / ${promo.maxUses}` : promo.usedCount}</td>
                <td><StatusBadge status={promo.isActive ? 'active' : 'inactive'} /></td>
                <td>
                  <div data-action-cluster>
                    <Link href={`/promotions/${promo._id}/usage`} data-btn-ghost data-btn-sm>Usage</Link>
                    <button type="button" data-btn-ghost data-btn-sm data-destructive
                      onClick={() => setDeleteId(promo._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); resetModal(); }} title="New promotion">
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate data-form>
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
              <select id="pr-type" {...form.register('type')}>
                {DISCOUNT_TYPES.map((t) => <option key={t} value={t}>{DISCOUNT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="pr-value">
                {type === 'percentage' ? 'Discount %'
                  : type === 'free_night' ? 'Value of one free night (ZAR)'
                  : 'Discount amount (ZAR)'}
              </label>
              <input id="pr-value" type="number" min={0} step="0.01" {...form.register('value')} />
              <InlineError message={form.formState.errors.value?.message} />
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
              <input id="pr-until" type="date" {...form.register('validTo')} />
              <InlineError message={form.formState.errors.validTo?.message} />
            </div>
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="pr-max">Max uses <span data-optional>(optional)</span></label>
              <input id="pr-max" type="number" min={1} {...form.register('maxUses')} />
            </div>
            <div data-form-group>
              <label htmlFor="pr-min-value">Min booking value (ZAR) <span data-optional>(optional)</span></label>
              <input id="pr-min-value" type="number" min={0} step="0.01" placeholder="0" {...form.register('minBookingValue')} />
            </div>
          </div>

          <div data-form-group>
            <label>Applies to</label>
            <div data-radio-row>
              <label data-radio-option>
                <input type="radio" name="room-scope" checked={roomScope === 'all'}
                  onChange={() => { setRoomScope('all'); setSelectedRoomIds([]); }} />
                {' '}All rooms
              </label>
              <label data-radio-option>
                <input type="radio" name="room-scope" checked={roomScope === 'specific'}
                  onChange={() => setRoomScope('specific')} />
                {' '}Specific rooms
              </label>
            </div>
            {roomScope === 'specific' && (
              <div data-room-picker>
                {roomsLoading ? <SkeletonLoader rows={2} /> : !rooms?.length ? (
                  <p data-hint>No rooms found.</p>
                ) : rooms.map((room) => (
                  <label key={room._id} data-checkbox-label data-room-picker-item>
                    <input type="checkbox"
                      checked={selectedRoomIds.includes(room._id)}
                      onChange={() => toggleRoom(room._id)} />
                    Room {room.roomNumber}
                    <span data-room-picker-type>{room.type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div data-form-group>
            <label>Active days <span data-optional>(optional — every day if none selected)</span></label>
            <div data-day-quickpicks>
              <button type="button" data-btn-ghost data-btn-sm onClick={() => setDaysOfWeek([])}>Every day</button>
              <button type="button" data-btn-ghost data-btn-sm onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}>Weekdays</button>
              <button type="button" data-btn-ghost data-btn-sm onClick={() => setDaysOfWeek([0, 6])}>Weekend</button>
            </div>
            <div data-day-toggle-row>
              {DAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  data-day-toggle
                  data-active={daysOfWeek.includes(day) || undefined}
                  onClick={() => toggleDay(day)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowNew(false); resetModal(); }}>Cancel</button>
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
