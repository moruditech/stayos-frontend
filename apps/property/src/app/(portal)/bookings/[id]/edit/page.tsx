'use client';

/**
 * Edit booking — staff view.
 *
 * This route previously didn't exist at all (the detail page's "Edit
 * booking" link pointed here, but there was no page.tsx under this
 * directory, so it 404'd). It only covers the fields the backend's
 * PATCH /bookings/:id actually accepts — see updateBookingSchema in
 * @stayos/validators, which mirrors bookings.validation.js exactly.
 *
 * checkIn/checkOut/roomId are deliberately NOT editable here — those go
 * through the separate reschedule flow, which re-runs availability and
 * rate-plan conflict checks that a plain field update doesn't.
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { updateBookingSchema, type UpdateBookingInput } from '@stayos/validators';
import {
  SkeletonLoader,
  InlineError,
  applyServerErrors,
  useToast,
  RoleGate,
  Icons,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { bookingKeys } from '@/lib/query-keys';

export default function EditBookingPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.bookings.get(id),
  });

  // adults/children/notes/specialRequests/isVip/confirmationNumber aren't on
  // the strict PopulatedBooking type (see packages/types/src/booking.ts) even
  // though they're real fields on the model — the booking detail page works
  // around this the same way.
  const b = booking as unknown as Record<string, unknown> | undefined;

  const form = useForm<UpdateBookingInput>({
    resolver: zodResolver(updateBookingSchema),
    // react-hook-form resets the form whenever this object changes by value —
    // exactly what's needed here since `booking` arrives asynchronously.
    // Spread conditionally (not `values: booking ? {...} : undefined`) since
    // exactOptionalPropertyTypes rejects explicitly assigning undefined to
    // an optional property.
    ...(booking
      ? {
          values: {
            adults: Number(b?.['adults'] ?? 1),
            children: Number(b?.['children'] ?? 0),
            notes: typeof b?.['notes'] === 'string' ? b['notes'] : '',
            specialRequests: typeof b?.['specialRequests'] === 'string' ? b['specialRequests'] : '',
            isVip: Boolean(b?.['isVip'] ?? false),
            source: (booking.source as UpdateBookingInput['source']) ?? 'direct',
          },
        }
      : {}),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateBookingInput) => api.bookings.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast('Booking updated.', 'success');
      router.replace(`/bookings/${id}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else if (err.code === 'TRANSITION_INVALID') toast(err.message, 'error');
      else toast(err.message ?? 'Failed to update booking.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (!booking) return <p>Booking not found.</p>;

  return (
    <RoleGate
      perm={PERMISSIONS.BOOKING_MANAGE}
      fallback={<p data-notice>You don&apos;t have permission to edit this booking.</p>}
    >
      <div data-page="edit-booking">
        <div data-page-header>
          <div>
            <Link href={`/bookings/${id}`} data-breadcrumb>
              <Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Back to booking
            </Link>
            <h1>Edit booking {String(b?.['confirmationNumber'] ?? id.slice(-8).toUpperCase())}</h1>
          </div>
        </div>

        <div data-form-container>
          <form
            data-form
            noValidate
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
          >
            <p data-form-note>
              Check-in, check-out, and room changes aren&apos;t made here — go back to the
              booking and use Reschedule so availability and rate-plan conflicts get
              re-checked.
            </p>

            <div data-form-row>
              <div data-form-group>
                <label htmlFor="adults">Adults</label>
                <input id="adults" type="number" min={1} {...form.register('adults', { valueAsNumber: true })} />
                <InlineError message={form.formState.errors.adults?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="children">Children</label>
                <input id="children" type="number" min={0} {...form.register('children', { valueAsNumber: true })} />
                <InlineError message={form.formState.errors.children?.message} />
              </div>
            </div>

            <div data-form-group>
              <label htmlFor="source">Booking source</label>
              <select id="source" {...form.register('source')}>
                <option value="direct">Direct / In-person</option>
                <option value="walk_in">Walk-in</option>
                <option value="phone">Phone</option>
                <option value="agency">Agency</option>
                <option value="corporate">Corporate</option>
                <option value="ota_airbnb">Airbnb</option>
                <option value="ota_booking">Booking.com</option>
                <option value="ota_agoda">Agoda</option>
                <option value="ota_lekkeslaap">LekkeSlaap</option>
                <option value="ota_safarinow">SafariNow</option>
                <option value="ota_other">OTA (other)</option>
              </select>
              <InlineError message={form.formState.errors.source?.message} />
            </div>

            <div data-form-group data-checkbox-group>
              <label htmlFor="isVip">
                <input id="isVip" type="checkbox" {...form.register('isVip')} />
                {' '}Mark as VIP guest
              </label>
            </div>

            <div data-form-group>
              <label htmlFor="specialRequests">Special requests <span data-optional>(optional)</span></label>
              <textarea id="specialRequests" rows={3} maxLength={1000} {...form.register('specialRequests')} />
              <InlineError message={form.formState.errors.specialRequests?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="notes">Internal notes <span data-optional>(optional)</span></label>
              <textarea id="notes" rows={3} maxLength={1000} {...form.register('notes')} />
              <InlineError message={form.formState.errors.notes?.message} />
            </div>

            <div data-form-actions>
              <Link href={`/bookings/${id}`} data-btn-ghost>Cancel</Link>
              <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RoleGate>
  );
}
