import { z } from 'zod';

const BOOKING_SOURCES = [
  'direct',
  'walk_in',
  'phone',
  'agency',
  'corporate',
  'ota_airbnb',
  'ota_booking',
  'ota_agoda',
  'ota_lekkeslaap',
  'ota_safarinow',
  'ota_other',
] as const;

// ── POST /bookings (staff-created) ────────────────────────────────────────────
// Staff must supply either customerId (existing guest lookup) or the three
// guest* fields (new/unknown guest). The refine() below mirrors the backend's
// staffCreateBookingSchema.refine().
export const staffCreateBookingSchema = z
  .object({
    roomId: z.string().min(1, 'Room is required'),
    customerId: z.string().min(1).optional(),
    guestFirstName: z.string().min(1).optional(),
    guestLastName: z.string().min(1).optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().optional(),
    checkIn: z.string().min(1, 'Check-in date is required'),
    checkOut: z.string().min(1, 'Check-out date is required'),
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    ratePlanId: z.string().optional(),
    promotionId: z.string().optional(),
    source: z.enum(BOOKING_SOURCES).default('direct'),
    depositAmount: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
    specialRequests: z.string().max(1000).optional(),
    isVip: z.boolean().default(false),
    addOns: z
      .array(
        z.object({
          name: z.string().min(1),
          price: z.number().min(0),
          qty: z.number().int().min(1).default(1),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.customerId ||
      (data.guestFirstName && data.guestLastName && data.guestEmail),
    {
      message:
        'Provide either customerId, or guestFirstName, guestLastName, and guestEmail',
    }
  );
export type StaffCreateBookingInput = z.infer<typeof staffCreateBookingSchema>;

// ── POST /bookings/public (customer self-service) ─────────────────────────────
// customerId comes from session — not supplied in the request body.
// consentSnapshot required: the customer must acknowledge data sharing (TAD 07).
export const publicBookingSchema = z.object({
  roomId: z.string().min(1, 'Room is required'),
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  ratePlanId: z.string().optional(),
  promotionId: z.string().optional(),
  source: z.enum(BOOKING_SOURCES).default('direct'),
  notes: z.string().max(1000).optional(),
  specialRequests: z.string().max(1000).optional(),
  addOns: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().min(0),
        qty: z.number().int().min(1).default(1),
      })
    )
    .optional(),
  consentSnapshot: z.object({
    acknowledged: z.boolean(),
    text: z.string().min(1),
    fieldsDisclosed: z.array(z.string()).optional(),
    ipAddress: z.string().optional(),
  }),
});
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

// ── PATCH /bookings/:id ───────────────────────────────────────────────────────
// checkIn/checkOut/roomId are deliberately NOT in this schema — date and room
// changes go through PATCH /bookings/:id/reschedule to re-run conflict and
// rate checks. See backend comment in bookings.validation.js#updateBookingSchema
// and Document 11 §3.
export const updateBookingSchema = z
  .object({
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional(),
    specialRequests: z.string().max(1000).optional(),
    isVip: z.boolean().optional(),
    source: z.enum(BOOKING_SOURCES).optional(),
  })
  .partial();
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// ── PATCH /bookings/:id/reschedule ────────────────────────────────────────────
// At least one field required; the service merges over current values for
// fields not supplied.
export const rescheduleBookingSchema = z
  .object({
    roomId: z.string().min(1).optional(),
    checkIn: z.string().min(1).optional(),
    checkOut: z.string().min(1).optional(),
  })
  .refine((data) => data.roomId || data.checkIn || data.checkOut, {
    message: 'Provide at least one of roomId, checkIn, or checkOut',
  });
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

// ── Booking list filters ──────────────────────────────────────────────────────
export const bookingFiltersSchema = z.object({
  status: z.string().optional(),
  roomId: z.string().optional(),
  checkInFrom: z.string().optional(),
  checkInTo: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;
