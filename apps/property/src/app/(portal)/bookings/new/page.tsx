'use client';

import Link from 'next/link';

/**
 * Staff-created booking — Document 11 §3.
 *
 * Two guest-selection paths:
 *   A) Search for an existing customer by name/email → sends customerId.
 *   B) Enter guest details for someone with no account → backend resolves
 *      by email (reuses existing unclaimed record or creates new unclaimed).
 *
 * Post-creation behaviour differs by guest account status:
 *   - Active self-service guest  → booking created in 'pending_confirmation'
 *     status; guest has 24 hrs to confirm or the booking is auto-cancelled.
 *   - Unclaimed / new guest      → confirmed immediately, no waiting period.
 *
 * Both paths POST to the same /bookings endpoint — the backend handles the
 * distinction. The form surface is the deciding factor, not a separate route.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, applyServerErrors, useToast, Icons } from '@stayos/ui';

// ── Schema ────────────────────────────────────────────────────────────────────

// Must match the backend `staffCreateBookingSchema` enum exactly
// (src/modules/bookings/bookings.validation.js).
const BOOKING_SOURCES = [
  'direct', 'walk_in', 'phone', 'agency', 'corporate',
  'ota_airbnb', 'ota_booking', 'ota_agoda', 'ota_lekkeslaap', 'ota_safarinow', 'ota_other',
] as const;

const newGuestSchema = z.object({
  guestMode:      z.literal('new'),
  // Field names must match staffCreateBookingSchema on the backend exactly
  // (guestFirstName/guestLastName/guestEmail/guestPhone) — the "guest" prefix
  // distinguishes these from a staff member's own name elsewhere in the JWT.
  guestFirstName: z.string().min(1, 'First name is required'),
  guestLastName:  z.string().min(1, 'Last name is required'),
  guestEmail:     z.string().email('Valid email required'),
  guestPhone:     z.string().optional(),
  roomId:         z.string().min(1, 'Room is required'),
  checkIn:        z.string().min(1, 'Check-in date is required'),
  checkOut:       z.string().min(1, 'Check-out date is required'),
  adults:         z.coerce.number().min(1).default(1),
  children:       z.coerce.number().min(0).default(0),
  source:         z.enum(BOOKING_SOURCES).default('direct'),
  notes:          z.string().optional(),
  promoCode:      z.string().optional(),
});

const existingGuestSchema = z.object({
  guestMode:  z.literal('existing'),
  customerId: z.string().min(1, 'Select a guest'),
  roomId:     z.string().min(1, 'Room is required'),
  checkIn:    z.string().min(1, 'Check-in date is required'),
  checkOut:   z.string().min(1, 'Check-out date is required'),
  adults:     z.coerce.number().min(1).default(1),
  children:   z.coerce.number().min(0).default(0),
  source:     z.enum(BOOKING_SOURCES).default('direct'),
  notes:      z.string().optional(),
  promoCode:  z.string().optional(),
});

type NewGuestInput = z.infer<typeof newGuestSchema>;
type ExistingGuestInput = z.infer<typeof existingGuestSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewBookingPage(): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const [guestMode, setGuestMode] = useState<'existing' | 'new'>('existing');
  const [guestSearch, setGuestSearch] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // Load available rooms for the room picker
  const { data: rooms } = useQuery({
    queryKey: ['rooms', 'list', {}],
    queryFn: () => api.rooms.list({ status: 'available' }),
  });

  // Guest search — debounced against a simple inline search
  const { data: guestResults } = useQuery({
    queryKey: ['guest-search', guestSearch],
    queryFn: () => api.bookings.searchGuests(guestSearch),
    enabled: guestMode === 'existing' && guestSearch.length >= 2,
  });

  const newForm = useForm<NewGuestInput>({
    resolver: zodResolver(newGuestSchema),
    defaultValues: { guestMode: 'new', adults: 1, children: 0, source: 'direct' },
  });

  const existingForm = useForm<ExistingGuestInput>({
    resolver: zodResolver(existingGuestSchema),
    defaultValues: { guestMode: 'existing', adults: 1, children: 0, source: 'direct' },
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.bookings.create(input as Parameters<typeof api.bookings.create>[0]),
    onSuccess: (booking) => {
      // The backend never sets `status` to 'pending_confirmation' — the
      // waiting-for-guest state lives in the separate `guestConfirmationStatus`
      // field, while `status` itself stays 'pending'.
      const guestConfirmationStatus = (booking as unknown as Record<string, unknown>)['guestConfirmationStatus'];
      if (guestConfirmationStatus === 'pending') {
        setPendingConfirm(true);
      } else {
        toast('Booking created and confirmed.', 'success');
        router.replace(`/bookings/${booking._id}`);
      }
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        if (guestMode === 'new') applyServerErrors(newForm, err);
        else applyServerErrors(existingForm, err);
        // A whole-form check (e.g. the backend's "must supply customerId or
        // full guest details" rule) has no single field to attach to, so
        // applyServerErrors silently drops it — see InlineError.tsx's own
        // warning about this. Surface those as a toast instead of letting
        // the submit button just quietly reset with no visible feedback.
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to create booking.', 'error');
      }
    },
  });

  // Resolves the human-readable promo code the staff member typed into a
  // promotionId (ObjectId) the backend actually accepts. The backend silently
  // ignores an unknown `promoCode` field, so this must happen client-side.
  async function resolvePromotionId(
    promoCode: string | undefined,
    form: UseFormReturn<FieldValues>
  ): Promise<{ promotionId?: string; ok: boolean }> {
    if (!promoCode) return { ok: true };
    try {
      const promo = await api.promotions.lookup(promoCode);
      return { promotionId: promo._id, ok: true };
    } catch {
      form.setError('promoCode' as never, { message: 'Promo code not found or no longer valid.' });
      return { ok: false };
    }
  }

  async function handleNewGuestSubmit(values: NewGuestInput): Promise<void> {
    const { guestMode: _m, promoCode, ...rest } = values;
    void _m;
    const { promotionId, ok } = await resolvePromotionId(promoCode, newForm as unknown as UseFormReturn<FieldValues>);
    if (!ok) return;
    createMutation.mutate({ ...rest, ...(promotionId ? { promotionId } : {}) });
  }

  async function handleExistingGuestSubmit(values: ExistingGuestInput): Promise<void> {
    const { guestMode: _m, promoCode, ...rest } = values;
    void _m;
    const { promotionId, ok } = await resolvePromotionId(promoCode, existingForm as unknown as UseFormReturn<FieldValues>);
    if (!ok) return;
    createMutation.mutate({ ...rest, ...(promotionId ? { promotionId } : {}) });
  }

  if (pendingConfirm) {
    return (
      <div data-page="new-booking">
        <div data-info-panel>
          <h1>Booking pending guest confirmation</h1>
          <p>
            This guest already has a self-service account. An email has been sent asking
            them to confirm the booking within 24 hours. If they don't confirm, the
            booking will be automatically cancelled and the room released.
          </p>
          <p>
            The booking is marked as <strong>Pending confirmation</strong> in your
            bookings list.
          </p>
          <div data-action-row>
            <Link href="/bookings" data-btn-ghost>Back to bookings</Link>
          </div>
        </div>
      </div>
    );
  }

  const sharedFields = (
    form: UseFormReturn<FieldValues>,
    formErrors: Record<string, { message?: string } | undefined>
  ) => (
    <>
      <div data-form-group>
        <label htmlFor="roomId">Room</label>
        <select id="roomId" {...form.register('roomId')}>
          <option value="">Select a room</option>
          {(rooms ?? []).map((r) => (
            <option key={r._id} value={r._id}>
              {r.roomNumber} — {r.type} ({r.name})
            </option>
          ))}
        </select>
        <InlineError message={formErrors['roomId']?.message} />
      </div>

      <div data-form-row>
        <div data-form-group>
          <label htmlFor="checkIn">Check-in</label>
          <input id="checkIn" type="date" {...form.register('checkIn')} />
          <InlineError message={formErrors['checkIn']?.message} />
        </div>
        <div data-form-group>
          <label htmlFor="checkOut">Check-out</label>
          <input id="checkOut" type="date" {...form.register('checkOut')} />
          <InlineError message={formErrors['checkOut']?.message} />
        </div>
      </div>

      <div data-form-row>
        <div data-form-group>
          <label htmlFor="adults">Adults</label>
          <input id="adults" type="number" min={1} {...form.register('adults')} />
        </div>
        <div data-form-group>
          <label htmlFor="children">Children</label>
          <input id="children" type="number" min={0} {...form.register('children')} />
        </div>
      </div>

      <div data-form-group>
        <label htmlFor="source">Booking source</label>
        <select id="source" {...form.register('source')}>
          <option value="direct">Direct / In-person</option>
          <option value="walk_in">Walk-in</option>
          <option value="phone">Phone</option>
          <option value="corporate">Corporate</option>
          <option value="ota_airbnb">Airbnb</option>
          <option value="ota_booking">Booking.com</option>
          <option value="ota_agoda">Agoda</option>
          <option value="ota_lekkeslaap">LekkeSlaap</option>
          <option value="ota_safarinow">SafariNow</option>
          <option value="ota_other">OTA (other)</option>
        </select>
      </div>

      <div data-form-group>
        <label htmlFor="promoCode">Promo code <span data-optional>(optional)</span></label>
        <input id="promoCode" type="text" {...form.register('promoCode')} />
      </div>

      <div data-form-group>
        <label htmlFor="notes">Internal notes <span data-optional>(optional)</span></label>
        <textarea id="notes" rows={3} {...form.register('notes')} />
      </div>
    </>
  );

  return (
    <div data-page="new-booking">
      <div data-page-header>
        <div>
          <Link href="/bookings" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Back to bookings</Link>
          <h1>New booking</h1>
        </div>
      </div>

      {/* Guest mode toggle */}
      <div data-tab-bar role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={guestMode === 'existing'}
          data-tab
          data-active={guestMode === 'existing' || undefined}
          onClick={() => setGuestMode('existing')}
        >
          Search existing guest
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={guestMode === 'new'}
          data-tab
          data-active={guestMode === 'new' || undefined}
          onClick={() => setGuestMode('new')}
        >
          Enter guest details
        </button>
      </div>

      <div data-form-container>
        {guestMode === 'existing' ? (
          <form
            onSubmit={existingForm.handleSubmit(handleExistingGuestSubmit)}
            noValidate
            data-form
          >
            <div data-form-group>
              <label htmlFor="guestSearch">Search guest by name or email</label>
              <input
                id="guestSearch"
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Type at least 2 characters…"
                autoComplete="off"
              />
              {guestSearch.length >= 2 && guestResults && (
                <div data-search-results>
                  {guestResults.length === 0 ? (
                    <p data-search-empty>No guests found. Try entering details below.</p>
                  ) : (
                    guestResults.map((g) => (
                      <button
                        key={g._id}
                        type="button"
                        data-search-result-item
                        onClick={() => {
                          existingForm.setValue('customerId', g._id);
                          setGuestSearch(`${g.firstName} ${g.lastName}`);
                        }}
                      >
                        <span>
                          {g.firstName} {g.lastName}
                          {g.isBlacklisted && <span data-tag-blacklisted> · Blacklisted</span>}
                        </span>
                        <span data-result-email>{g.email}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <InlineError message={existingForm.formState.errors.customerId?.message} />
            </div>

            {sharedFields(existingForm as unknown as UseFormReturn<FieldValues>, existingForm.formState.errors as unknown as Record<string, { message?: string } | undefined>)}

            <div data-form-actions>
              <Link href="/bookings" data-btn-ghost>Cancel</Link>
              <button type="submit" data-btn-primary disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating booking…' : 'Create booking'}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={newForm.handleSubmit(handleNewGuestSubmit)}
            noValidate
            data-form
          >
            <p data-form-note>
              If a guest account already exists for this email address, it will be
              reused rather than creating a duplicate. If this is an active self-service
              account, the guest will receive a confirmation email and has 24 hours to
              accept — the room is held during that window.
            </p>

            <div data-form-row>
              <div data-form-group>
                <label htmlFor="guestFirstName">First name</label>
                <input id="guestFirstName" type="text" {...newForm.register('guestFirstName')} />
                <InlineError message={newForm.formState.errors.guestFirstName?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="guestLastName">Last name</label>
                <input id="guestLastName" type="text" {...newForm.register('guestLastName')} />
                <InlineError message={newForm.formState.errors.guestLastName?.message} />
              </div>
            </div>

            <div data-form-group>
              <label htmlFor="guestEmail">Email</label>
              <input id="guestEmail" type="email" {...newForm.register('guestEmail')} />
              <InlineError message={newForm.formState.errors.guestEmail?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="guestPhone">Phone <span data-optional>(optional)</span></label>
              <input id="guestPhone" type="tel" {...newForm.register('guestPhone')} />
            </div>

            {sharedFields(newForm as unknown as UseFormReturn<FieldValues>, newForm.formState.errors as unknown as Record<string, { message?: string } | undefined>)}

            <div data-form-actions>
              <Link href="/bookings" data-btn-ghost>Cancel</Link>
              <button type="submit" data-btn-primary disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating booking…' : 'Create booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
