import { client } from '../client';

// Matches Room.model.js exactly. Note: baseRate, not ratePerNight — and
// there is no separate housekeepingStatus field. 'dirty'/'cleaning'/
// 'inspection' are values of the one status enum, not a second dimension.
// Actual housekeeping work is tracked by the separate HousekeepingTask
// model (see the /housekeeping module), not a field on Room itself.
export interface Room {
  _id: string;
  tenantId: string;
  name?: string;
  roomNumber: string;
  type: string;
  floor?: string;
  capacity: number;
  adultCapacity?: number;
  childCapacity?: number;
  bedCount: number;
  amenities: string[];
  description?: string;
  status: string; // 'available' | 'occupied' | 'dirty' | 'cleaning' | 'inspection' | 'maintenance' | 'blocked' | 'out_of_order'
  baseRate: number;
  rateUnit: string;
  weekendRate?: number;
  images: { url: string; caption?: string; order: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomBlock {
  _id: string;
  reason: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface RoomAvailability {
  roomId: string;
  available: boolean;
  blocks: RoomBlock[];
}

// GET /rooms/status-board — see rooms.service.js#getStatusBoard. Returns
// { rooms, grouped }, NOT a bare array — a page that does
// `statusBoard.map(...)` directly on the response (instead of
// `statusBoard.rooms.map(...)`) will throw, since a plain object has no
// .map. currentBooking is the full populated booking (or null), not a
// flat { name } shape.
export interface StatusBoardEntry extends Room {
  currentBooking: {
    _id: string;
    confirmationNumber: string;
    checkIn: string;
    checkOut: string;
    customerId: { firstName: string; lastName: string } | null;
  } | null;
}

export interface StatusBoardResponse {
  rooms: StatusBoardEntry[];
  grouped: Record<string, StatusBoardEntry[]>;
}

// GET /rooms/calendar-matrix — see rooms.service.js#getCalendarMatrix. This
// is a flat list of rooms/bookings/blocks for the visible range, NOT a
// pre-built per-room-per-date matrix — the frontend derives per-day cells
// from checkIn/checkOut (bookings) and from/to (blocks) itself.
export interface CalendarRoom {
  _id: string;
  roomNumber: string;
  name?: string;
  type: string;
  floor?: string;
  capacity: number;
  status: string; // 'available' | 'occupied' | 'dirty' | 'cleaning' | 'inspection' | 'maintenance' | 'blocked' | 'out_of_order'
  baseRate: number;
}

export interface CalendarBooking {
  _id: string;
  roomId: string;
  confirmationNumber: string;
  guestName: string | null;
  checkIn: string;
  checkOut: string;
  status: string; // 'pending' | 'confirmed' | 'checked_in' | 'cancelled'
  isTentative: boolean; // guestConfirmationStatus === 'pending' — awaiting the guest, not yet a firm hold
  source: string;
  isVip: boolean;
  depositPaid: boolean;
  hasBalanceDue: boolean;
  isExternal: boolean;
  externalUid: string | null;
  hasConflict: boolean;
  cancellationReason?: string;
}

export interface CalendarBlock {
  roomId: string;
  roomNumber: string;
  from: string;
  to: string;
  reason: string;
  blockedBy: string;
}

export interface CalendarMatrixResponse {
  range: { startDate: string; endDate: string };
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  blocks: CalendarBlock[];
  groupLinks: Record<string, string[]>;
}

export interface CalendarMatrixParams {
  startDate: string;
  endDate: string;
  roomType?: string;
  floor?: string;
  includeBlocked?: boolean;
  includeCancelled?: boolean;
  ratePlanId?: string;
  source?: string;
  // Spans both bookings and blocks — 'blocked'/'maintenance' clear the
  // bookings list and filter blocks by the room's current status instead,
  // since neither is a real Booking.status value. See
  // rooms.service.js#getCalendarMatrix.
  status?: 'confirmed' | 'checked_in' | 'tentative' | 'blocked' | 'maintenance';
}

export const roomsApi = {
  // GET /rooms
  list: (params?: Record<string, unknown>) =>
    client.get<Room[]>('/rooms', { params: params as Record<string, string | number | boolean | undefined> }),

  // POST /rooms
  create: (input: Partial<Room>) => client.post<Room>('/rooms', input),

  // GET /rooms/availability
  getAvailability: (params?: Record<string, unknown>) =>
    client.get<RoomAvailability[]>('/rooms/availability', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // GET /rooms/status-board
  getStatusBoard: () => client.get<StatusBoardResponse>('/rooms/status-board'),

  // GET /rooms/calendar-matrix
  getCalendarMatrix: (params: CalendarMatrixParams) =>
    client.get<CalendarMatrixResponse>('/rooms/calendar-matrix', {
      params: params as unknown as Record<string, string | number | boolean | undefined>,
    }),

  // GET /rooms/:id
  get: (id: string) => client.get<Room>(`/rooms/${id}`),

  // PATCH /rooms/:id
  update: (id: string, input: Partial<Room>) => client.patch<Room>(`/rooms/${id}`, input),

  // DELETE /rooms/:id
  delete: (id: string) => client.delete<{ message: string }>(`/rooms/${id}`),

  // PATCH /rooms/:id/status
  updateStatus: (id: string, status: string, housekeepingStatus?: string) =>
    client.patch<Room>(`/rooms/${id}/status`, { status, housekeepingStatus }),

  // POST /rooms/:id/block
  block: (id: string, input: { reason: string; startDate: string; endDate: string }) =>
    client.post<Room>(`/rooms/${id}/block`, input),

  // DELETE /rooms/:id/block/:blockId
  unblock: (id: string, blockId: string) =>
    client.delete<Room>(`/rooms/${id}/block/${blockId}`),

  // POST /rooms/:id/ical-export/enable
  enableIcalExport: (id: string) =>
    client.post<{ feedUrl: string }>(`/rooms/${id}/ical-export/enable`),

  // POST /rooms/:id/ical-export/regenerate
  regenerateIcalFeed: (id: string) =>
    client.post<{ feedUrl: string }>(`/rooms/${id}/ical-export/regenerate`),

  // POST /rooms/:id/images
  uploadImage: (id: string, formData: FormData) =>
    client.post<Room>(`/rooms/${id}/images`, formData),

  // DELETE /rooms/:id/images/:imageId
  deleteImage: (id: string, imageId: string) =>
    client.delete<Room>(`/rooms/${id}/images/${imageId}`),

  // PATCH /rooms/:id/images/reorder
  reorderImages: (id: string, order: { imageId: string; order: number }[]) =>
    client.patch<Room>(`/rooms/${id}/images/reorder`, { order }),
};
