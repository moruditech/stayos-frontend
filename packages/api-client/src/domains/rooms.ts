import { client } from '../client';

export interface Room {
  _id: string;
  tenantId: string;
  name: string;
  roomNumber: string;
  type: string;
  floor?: string;
  building?: string;
  status: string;
  housekeepingStatus: string;
  capacity: number;
  bedType: string;
  amenities: string[];
  ratePerNight: number;
  images: { url: string; order: number }[];
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

export interface StatusBoardEntry {
  _id: string;
  roomNumber: string;
  type: string;
  floor?: string;
  status: string;
  housekeepingStatus: string;
  currentGuest?: { name: string };
  checkOut?: string;
  ratePerNight: number;
}

export interface CalendarMatrixEntry {
  roomId: string;
  roomNumber: string;
  type: string;
  dates: Record<string, { bookingId?: string; guestName?: string; status: string }>;
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
  getStatusBoard: () => client.get<StatusBoardEntry[]>('/rooms/status-board'),

  // GET /rooms/calendar-matrix
  getCalendarMatrix: (params?: Record<string, unknown>) =>
    client.get<CalendarMatrixEntry[]>('/rooms/calendar-matrix', {
      params: params as Record<string, string | number | boolean | undefined>,
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
