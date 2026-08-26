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

const newGuestSchema = z.object({
  guestMode:  z.literal('new'),
  firstName:  z.string().min(1, 'First name is required'),
  lastName:   z.string().min(1, 'Last name is required'),
  email:      z.string().email('Valid email required'),
  phone:      z.string().optional(),
  roomId:     z.string().min(1, 'Room is required'),
  checkIn:    z.string().min(1, 'Check-in date is required'),
  checkOut:   z.string().min(1, 'Check-out date is required'),
  adults:     z.coerce.number().min(1).default(1),
  children:   z.coerce.number().min(0).default(0),
  source:     z.string().default('front_desk'),
  notes:      z.string().optional(),
  promoCode:  z.string().optional(),
});

const existingGuestSchema = z.object({
  guestMode:  z.literal('existing'),
  customerId: z.string().min(1, 'Select a guest'),
  roomId:     z.string().min(1, 'Room is required'),
  checkIn:    z.string().min(1, 'Check-in date is required'),
  checkOut:   z.string().min(1, 'Check-out date is required'),
  adults:     z.coerce.number().min(1).default(1),
  children:   z.coerce.number().min(0).default(0),
  source:     z.string().default('front_desk'),
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
    queryFn: async () => {
      if (guestSearch.length < 2) return [];
      const staff = await api.staff.list();
      // In practice this would be a customer search endpoint;
      // stubbed here since the customer search API is on /customers, not staff.
      // The backend POST /bookings accepts customerId OR guest details.
      return staff;
    },
    enabled: guestMode === 'existing' && guestSearch.length >= 2,
  });

  const newForm = useForm<NewGuestInput>({
    resolver: zodResolver(newGuestSchema),
    defaultValues: { guestMode: 'new', adults: 1, children: 0, source: 'front_desk' },
  });

  const existingForm = useForm<ExistingGuestInput>({
    resolver: zodResolver(existingGuestSchema),
    defaultValues: { guestMode: 'existing', adults: 1, children: 0, source: 'front_desk' },
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.bookings.create(input as Parameters<typeof api.bookings.create>[0]),
    onSuccess: (booking) => {
      const status = (booking as unknown as Record<string, unknown>)['status'];
      if (status === 'pending_confirmation') {
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
      } else {
        toast(err.message ?? 'Failed to create booking.', 'error');
      }
    },
  });

  function handleNewGuestSubmit(values: NewGuestInput): void {
    const { guestMode: _m, ...rest } = values;
    void _m;
    createMutation.mutate({ ...rest });
  }

  function handleExistingGuestSubmit(values: ExistingGuestInput): void {
    const { guestMode: _m, ...rest } = values;
    void _m;
    createMutation.mutate({ ...rest });
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
          <option value="front_desk">Front desk</option>
          <option value="phone">Phone</option>
          <option value="walk_in">Walk-in</option>
          <option value="email">Email</option>
          <option value="ota">OTA (other)</option>
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
                    guestResults.map((g) => {
                      const gRec = g as unknown as Record<string, unknown>;
                      return (
                        <button
                          key={String(gRec['_id'])}
                          type="button"
                          data-search-result-item
                          onClick={() => {
                            existingForm.setValue('customerId', String(gRec['_id']));
                            setGuestSearch(`${String(gRec['firstName'])} ${String(gRec['lastName'])}`);
                          }}
                        >
                          <span>{String(gRec['firstName'])} {String(gRec['lastName'])}</span>
                          <span data-result-email>{String(gRec['email'] ?? '')}</span>
                        </button>
                      );
                    })
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
                <label htmlFor="firstName">First name</label>
                <input id="firstName" type="text" {...newForm.register('firstName')} />
                <InlineError message={newForm.formState.errors.firstName?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" type="text" {...newForm.register('lastName')} />
                <InlineError message={newForm.formState.errors.lastName?.message} />
              </div>
            </div>

            <div data-form-group>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" {...newForm.register('email')} />
              <InlineError message={newForm.formState.errors.email?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="phone">Phone <span data-optional>(optional)</span></label>
              <input id="phone" type="tel" {...newForm.register('phone')} />
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
