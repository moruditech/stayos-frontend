'use client';

import Link from 'next/link';

/**
 * New room — Rooms & Availability.
 *
 * Field names and enums match the backend `createRoomSchema` exactly
 * (src/modules/rooms/rooms.validation.js): roomNumber, type, floor,
 * capacity, adultCapacity, childCapacity, bedCount, amenities,
 * description, baseRate, rateUnit, weekendRate.
 *
 * Note: the backend field for nightly price is `baseRate`, not
 * `ratePerNight` — the status board reads a `ratePerNight` field that
 * the backend does not actually produce (pre-existing inconsistency,
 * out of scope here). This form submits the fields the API accepts.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast, Icons } from '@stayos/ui';
import { roomKeys } from '@/lib/query-keys';

const ROOM_TYPES = [
  'single', 'double', 'twin', 'triple', 'suite', 'dormitory', 'apartment', 'studio',
] as const;

const RATE_UNITS = ['per_night', 'per_week', 'per_month', 'per_semester'] as const;

const schema = z.object({
  roomNumber:    z.string().min(1, 'Room number is required').max(20),
  name:          z.string().max(200).optional(),
  type:          z.enum(ROOM_TYPES, { errorMap: () => ({ message: 'Room type is required' }) }),
  floor:         z.string().max(20).optional(),
  capacity:      z.coerce.number().int().min(1, 'Capacity must be at least 1').max(100),
  adultCapacity: z.coerce.number().int().min(0).optional(),
  childCapacity: z.coerce.number().int().min(0).optional(),
  bedCount:      z.coerce.number().int().min(1).default(1),
  amenities:     z.string().optional(),
  description:   z.string().max(2000).optional(),
  baseRate:      z.coerce.number().positive('Base rate must be a positive number'),
  rateUnit:      z.enum(RATE_UNITS).default('per_night'),
  // z.coerce.number() alone doesn't work for an optional-but-positive
  // field: react-hook-form sends '' (not undefined) for an untouched
  // number input, and Number('') is 0 — which then fails .positive()
  // regardless of .optional(). Preprocessing '' to undefined first is
  // what actually lets the field be left blank.
  weekendRate: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Weekend rate must be a positive number').optional()
  ),
});
type FormInput = z.infer<typeof schema>;

export default function NewRoomPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { bedCount: 1, rateUnit: 'per_night' },
  });

  const createMutation = useMutation({
    mutationFn: (input: FormInput) => {
      const { amenities, ...rest } = input;
      const amenitiesList = amenities
        ? amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : undefined;
      return api.rooms.create({
        ...rest,
        ...(amenitiesList ? { amenities: amenitiesList } : {}),
      } as unknown as Parameters<typeof api.rooms.create>[0]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.all });
      toast('Room created.', 'success');
      // No /rooms/[id] detail page exists yet to redirect to (that's a
      // separate, bigger piece of work) — clear the form back to its
      // defaults instead, so adding several rooms in a row doesn't
      // require re-navigating here each time.
      form.reset({ bedCount: 1, rateUnit: 'per_night' });
      form.setFocus('roomNumber');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to create room.', 'error');
    },
  });

  return (
    <div data-page="new-room">
      <div data-page-header>
        <div>
          <Link href="/rooms" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Rooms</Link>
          <h1>Add room</h1>
        </div>
      </div>

      <div data-form-container>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="roomNumber">Room number</label>
              <input id="roomNumber" type="text" placeholder="e.g. 101" {...form.register('roomNumber')} />
              <InlineError message={form.formState.errors.roomNumber?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="name">Display name <span data-optional>(optional)</span></label>
              <input id="name" type="text" placeholder="e.g. Garden Suite" {...form.register('name')} />
            </div>
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="type">Room type</label>
              <select id="type" {...form.register('type')}>
                <option value="">Select type…</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <InlineError message={form.formState.errors.type?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="floor">Floor <span data-optional>(optional)</span></label>
              <input id="floor" type="text" placeholder="e.g. 1" {...form.register('floor')} />
            </div>
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="capacity">Capacity</label>
              <input id="capacity" type="number" min={1} max={100} {...form.register('capacity')} />
              <InlineError message={form.formState.errors.capacity?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="adultCapacity">Adult capacity <span data-optional>(optional)</span></label>
              <input id="adultCapacity" type="number" min={0} {...form.register('adultCapacity')} />
            </div>
            <div data-form-group>
              <label htmlFor="childCapacity">Child capacity <span data-optional>(optional)</span></label>
              <input id="childCapacity" type="number" min={0} {...form.register('childCapacity')} />
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="bedCount">Bed count</label>
            <input id="bedCount" type="number" min={1} {...form.register('bedCount')} />
          </div>

          <div data-form-group>
            <label htmlFor="amenities">Amenities <span data-optional>(optional)</span></label>
            <input id="amenities" type="text" placeholder="Comma-separated, e.g. Wi-Fi, TV, Air conditioning" {...form.register('amenities')} />
            <p data-field-hint>Separate multiple amenities with commas.</p>
          </div>

          <div data-form-group>
            <label htmlFor="description">Description <span data-optional>(optional)</span></label>
            <textarea id="description" rows={3} {...form.register('description')} />
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="baseRate">Base rate (ZAR)</label>
              <input id="baseRate" type="number" min={0} step="0.01" {...form.register('baseRate')} />
              <InlineError message={form.formState.errors.baseRate?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="rateUnit">Rate unit</label>
              <select id="rateUnit" {...form.register('rateUnit')}>
                <option value="per_night">Per night</option>
                <option value="per_week">Per week</option>
                <option value="per_month">Per month</option>
                <option value="per_semester">Per semester</option>
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="weekendRate">Weekend rate <span data-optional>(optional)</span></label>
              <input id="weekendRate" type="number" min={0} step="0.01" {...form.register('weekendRate')} />
            </div>
          </div>

          <div data-form-actions>
            <Link href="/rooms" data-btn-ghost>Cancel</Link>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating room…' : 'Create room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
