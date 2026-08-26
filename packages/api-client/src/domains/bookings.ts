import { client } from '../client';
import type { Booking, PopulatedBooking } from '@stayos/types';
import type {
  StaffCreateBookingInput,
  PublicBookingInput,
  UpdateBookingInput,
  RescheduleBookingInput,
  BookingFilters,
} from '@stayos/validators';

export const bookingsApi = {
  // GET /bookings — staff list (Property Operations Portal). customerId and
  // roomId come back populated — see bookings.service.js#listBookings.
  list: (filters?: BookingFilters) =>
    client.get<PopulatedBooking[]>('/bookings', { params: filters as Record<string, string | number | boolean | undefined> }),

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

  // GET /customers/me/bookings — customer's own bookings
  listMine: () => client.get<Booking[]>('/customers/me/bookings'),

  // GET /customers/me/bookings/:id — customer's own booking detail
  getMine: (id: string) => client.get<Booking>(`/customers/me/bookings/${id}`),

  // GET /bookings/:id/folio
  getFolio: (id: string) => client.get<unknown>(`/bookings/${id}/folio`),
};
