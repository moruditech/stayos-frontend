import { client } from '../client';
import type { Booking, PopulatedBooking } from '@stayos/types';
import type {
  StaffCreateBookingInput,
  PublicBookingInput,
  UpdateBookingInput,
  RescheduleBookingInput,
  BookingFilters,
} from '@stayos/validators';

// GET /bookings/guests result shape — see bookings.service.js#searchGuests.
// Not the full Customer record, just enough to disambiguate a search result.
export interface GuestSearchResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountStatus: string;
  isBlacklisted: boolean;
}

export const bookingsApi = {
  // GET /bookings — staff list (Property Operations Portal). customerId and
  // roomId come back populated — see bookings.service.js#listBookings.
  list: (filters?: BookingFilters) =>
    client.get<PopulatedBooking[]>('/bookings', { params: filters as Record<string, string | number | boolean | undefined> }),

  // GET /bookings/guests — existing-guest lookup for the "existing guest"
  // path of staff booking creation. Searches Customer by name/email; this is
  // NOT a general customer/CRM search and is unrelated to staff.list().
  searchGuests: (search: string) =>
    client.get<GuestSearchResult[]>('/bookings/guests', { params: { search } }),

  // GET /bookings/:id — staff detail. Also populated — see #getBooking.
  get: (id: string) => client.get<PopulatedBooking>(`/bookings/${id}`),

  // POST /bookings — staff-created booking (Document 11 §3)
  create: (input: StaffCreateBookingInput) =>
    client.post<Booking>('/bookings', input),

  // POST /bookings/public — customer self-service booking (Document 10 §4)
  createPublic: (input: PublicBookingInput) =>
    client.post<Booking>('/bookings/public', input),

  // PATCH /bookings/:id — non-date updates only (source, notes, isVip, etc.)
  // checkIn/checkOut/roomId changes go through reschedule() below.
  update: (id: string, input: UpdateBookingInput) =>
    client.patch<Booking>(`/bookings/${id}`, input),

  // PATCH /bookings/:id/reschedule — date/room changes with conflict re-check
  reschedule: (id: string, input: RescheduleBookingInput) =>
    client.patch<Booking>(`/bookings/${id}/reschedule`, input),

  // POST /bookings/:id/cancel
  cancel: (id: string, reason?: string) =>
    client.post<Booking>(`/bookings/${id}/cancel`, { reason }),

  // POST /bookings/:id/no-show
  noShow: (id: string) => client.post<Booking>(`/bookings/${id}/no-show`),

  // POST /bookings/:id/check-in — blocked with a 422 GUEST_REGISTER_REQUIRED
  // error until a guest register entry exists for this booking; see
  // guestregisterApi below and stayos-audit-report.md G-02.
  checkIn: (id: string) => client.post<Booking>(`/bookings/${id}/check-in`),

  // GET /customers/me/bookings — customer's own bookings
  listMine: () => client.get<Booking[]>('/customers/me/bookings'),

  // GET /customers/me/bookings/:id — customer's own booking detail
  getMine: (id: string) => client.get<Booking>(`/customers/me/bookings/${id}`),

  // GET /bookings/:id/folio
  getFolio: (id: string) => client.get<unknown>(`/bookings/${id}/folio`),
};
