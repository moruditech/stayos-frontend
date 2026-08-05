export interface Booking {
  _id: string;
  tenantId: string;
  roomId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  source: string; // booking origin — distinct axis from paymentSource
  paymentSource: string;
  // Locked at creation — never recalculated. Do not build an edit form
  // that treats these as mutable on an existing booking.
  ratePerNight: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  externalUid: string | null; // iCal import identifier
  externalFeedId: string | null;
  // Present on the model but NOT enforced by PATCH /bookings/:id today —
  // verified directly against bookings.controller.js#updateBooking, which
  // is a raw findOneAndUpdate(filter, req.body) with no version check, no
  // field allowlist, and no audit log write. Version/conflict handling
  // exists only in the offline-sync module (out of scope per TAD 00).
  // Do NOT build a "this record changed since you loaded it" UI against
  // this field until the backend adds real enforcement — send it back on
  // update for forward-compatibility, but treat any resulting write as
  // last-write-wins in the interim.
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingInput {
  roomId: string;
  customerId?: string; // set when booking on behalf of an existing/known guest
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  promotionCode?: string;
  addOnIds?: string[];
}

export interface UpdateBookingInput {
  checkIn?: string;
  checkOut?: string;
  version: number; // sent for forward-compatibility — see note above
}

export interface BookingFilters {
  status?: string;
  roomId?: string;
  checkInFrom?: string;
  checkInTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}
