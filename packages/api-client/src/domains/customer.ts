import { client } from '../client';

export const discoveryApi = {
  searchProperties: (params?: Record<string, string | number | boolean | undefined>) =>
    client.get<Record<string, unknown>[]>('/discovery/properties', { params }),

  searchCities: (q: string) =>
    client.get<Record<string, unknown>[]>('/discovery/search/cities', { params: { q } }),

  getFeatured: () =>
    client.get<Record<string, unknown>[]>('/discovery/featured'),

  getProperty: (slug: string) =>
    client.get<Record<string, unknown>>(`/discovery/properties/${slug}`),

  getPropertyRooms: (slug: string, params?: Record<string, string | undefined>) =>
    client.get<Record<string, unknown>[]>(`/discovery/properties/${slug}/rooms`, { params }),

  getPropertyAvailability: (slug: string, params: Record<string, string>) =>
    client.get<Record<string, unknown>>(`/discovery/properties/${slug}/availability`, { params }),

  getPropertyCalendar: (slug: string, params?: Record<string, string | undefined>) =>
    client.get<Record<string, unknown>>(`/discovery/properties/${slug}/calendar`, { params }),

  getPropertyReviews: (slug: string, page = 1) =>
    client.get<Record<string, unknown>[]>(`/discovery/properties/${slug}/reviews`, {
      params: { page },
    }),

  // Bridge from a property's public slug to its (independently-slugged)
  // student housing application form(s). A property can have more than one
  // currently-open form (e.g. overlapping academic years), so this returns
  // a list — the applicant picks which one to apply to.
  listApplicationForms: (slug: string) =>
    client.get<Record<string, unknown>[]>(`/discovery/properties/${slug}/application-forms`),

  submitApplicationForProperty: (slug: string, formId: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/discovery/properties/${slug}/application-forms/${formId}/apply`, input),
};

export const customerApi = {
  // GET/PATCH /customers/me
  getMe: () => client.get<Record<string, unknown>>('/customers/me'),
  updateMe: (input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>('/customers/me', input),

  // POST /customers/me/reveal — unmask one PII field at a time (rate-limited, logged)
  revealField: (field: string) =>
    client.post<{ value: string }>('/customers/me/reveal', { field }),

  // PATCH /customers/me/password
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    client.patch<{ message: string }>('/customers/me/password', input),

  // PATCH /customers/me/communication-prefs
  updateCommPrefs: (prefs: Record<string, boolean>) =>
    client.patch<Record<string, unknown>>('/customers/me/communication-prefs', prefs),

  // GET/POST /customers/me/documents
  listDocuments: () => client.get<Record<string, unknown>[]>('/customers/me/documents'),
  uploadDocument: (formData: FormData) =>
    client.post<Record<string, unknown>>('/customers/me/documents', formData),

  // GET /customers/me/bookings
  listBookings: () => client.get<Record<string, unknown>[]>('/customers/me/bookings'),
  getBooking: (id: string) => client.get<Record<string, unknown>>(`/customers/me/bookings/${id}`),
  cancelBooking: (id: string, reason?: string) =>
    client.post<Record<string, unknown>>(`/customers/me/bookings/${id}/cancel`, { reason }),

  // GET/POST /customers/me/bookings/:id/messages — one GuestThread per
  // (tenant, customer); the same thread staff see and reply to.
  getBookingMessages: (bookingId: string) =>
    client.get<Record<string, unknown>>(`/customers/me/bookings/${bookingId}/messages`),
  sendBookingMessage: (bookingId: string, body: string) =>
    client.post<Record<string, unknown>>(`/customers/me/bookings/${bookingId}/messages`, { body }),

  // POST /payments/booking/:bookingId — customer-initiated payment against a
  // booking they own; the backend resolves tenantId from the ownership
  // check, so no tenantId is passed here. Returns { paymentUrl, ... } to
  // redirect the browser to for gateway checkout.
  initiateBookingPayment: (bookingId: string, input: { type: string; gateway: string; amount: number; currency?: string }) =>
    client.post<Record<string, unknown>>(`/payments/booking/${bookingId}`, input),

  // GET /customers/me/applications
  listApplications: () =>
    client.get<Record<string, unknown>[]>('/customers/me/applications'),
  getApplication: (id: string) =>
    client.get<Record<string, unknown>>(`/customers/me/applications/${id}`),
  getApplicationMessages: (applicationId: string) =>
    client.get<Record<string, unknown>>(`/customers/me/applications/${applicationId}/messages`),
  sendApplicationMessage: (applicationId: string, body: string) =>
    client.post<Record<string, unknown>>(`/customers/me/applications/${applicationId}/messages`, { body }),

  // GET /customers/me/payments
  listPayments: () => client.get<Record<string, unknown>[]>('/customers/me/payments'),
  getPayment: (id: string) => client.get<Record<string, unknown>>(`/customers/me/payments/${id}`),

  // GET /customers/me/invoices
  listInvoices: () => client.get<Record<string, unknown>[]>('/customers/me/invoices'),

  // GET /customers/me/leases
  listLeases: () => client.get<Record<string, unknown>[]>('/customers/me/leases'),

  // GET /customers/me/loyalty
  getLoyalty: () => client.get<Record<string, unknown>>('/customers/me/loyalty'),
  getLoyaltyHistory: () =>
    client.get<Record<string, unknown>[]>('/customers/me/loyalty/history'),
  redeemLoyalty: (points: number) =>
    client.post<{ message: string }>('/customers/me/loyalty/redeem', { points }),

  // GET/POST /customers/me/complaints
  listComplaints: () => client.get<Record<string, unknown>[]>('/customers/me/complaints'),
  createComplaint: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/customers/me/complaints', input),

  // GET/POST/DELETE /customers/me/wishlist
  // Note: the backend keys wishlist entries by `tenantId` (a property is a
  // Tenant document) — POST must send `tenantId`, not `propertyId`, or the
  // request 422s silently and the heart button appears to do nothing.
  getWishlist: () => client.get<Record<string, unknown>[]>('/customers/me/wishlist'),
  addToWishlist: (tenantId: string) =>
    client.post<Record<string, unknown>>('/customers/me/wishlist', { tenantId }),
  removeFromWishlist: (tenantId: string) =>
    client.delete<{ message: string }>(`/customers/me/wishlist/${tenantId}`),

  // GET /customers/me/reviews
  listReviews: () => client.get<Record<string, unknown>[]>('/customers/me/reviews'),

  // GET /customers/me/data-export
  requestDataExport: () =>
    client.get<Record<string, unknown>>('/customers/me/data-export'),

  // DELETE /customers/me
  deleteAccount: () => client.delete<{ message: string }>('/customers/me'),

  // POST /auth/register (customer self-registration)
  register: (input: Record<string, unknown>) =>
    client.post<{ message: string }>('/auth/register', input),
};

export const notificationsApi = {
  list: () => client.get<Record<string, unknown>[]>('/notifications'),
  getUnreadCount: () => client.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => client.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => client.patch<void>('/notifications/read-all'),
  delete: (id: string) => client.delete<void>(`/notifications/${id}`),
  getPreferences: () => client.get<Record<string, unknown>>('/notifications/preferences'),
  updatePreferences: (prefs: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>('/notifications/preferences', prefs),
};

export const reviewsApi = {
  create: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/reviews', input),

  // ── Platform moderation (Document 14 §8) ───────────────────────────────
  // CONFIRMED BACKEND GAP: GET /reviews is mounted with checkScope('tenant')
  // only (reviews.routes.js) — a platform-scoped session cannot actually
  // call it today, even though PATCH /reviews/:id/status correctly requires
  // checkScope('platform') + content:manage, and listReviews's filter
  // ({tenantId}) has no cross-tenant branch the way getReview (singular)
  // does. This mirrors the same shape of gap as Document 05 §3.1's
  // property_manager room-join issue: flagged for a backend ticket, not
  // routed around here. Called as designed so it starts working the moment
  // the scope + service-layer fix lands; the Moderation page handles the
  // resulting 403 as a normal error state in the meantime.
  listForModeration: (params?: { status?: string | undefined; page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<Record<string, unknown>>('/reviews', { params }),

  // PATCH /reviews/:id/status — content:manage, platform-scoped. This one
  // is correctly wired.
  moderate: (id: string, status: 'approved' | 'rejected' | 'flagged') =>
    client.patch<Record<string, unknown>>(`/reviews/${id}/status`, { status }),
};

export const supportApi = {
  // GET /support/tickets/mine — CORRECTED: paginated on the backend
  // (support.service.js#getMyTickets uses paginate()); an earlier pass of
  // this file dropped the meta entirely.
  listMine: (params?: { page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<Record<string, unknown>>('/support/tickets/mine', { params }),
  get: (id: string) => client.get<Record<string, unknown>>(`/support/tickets/${id}`),
  create: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/support/tickets', input),
  getMessages: (id: string) =>
    client.get<Record<string, unknown>[]>(`/support/tickets/${id}/messages`),
  addMessage: (id: string, body: string, isInternal?: boolean) =>
    client.post<Record<string, unknown>>(`/support/tickets/${id}/message`, {
      body,
      isInternal,
    }),
  rate: (id: string, rating: number) =>
    client.post<{ message: string }>(`/support/tickets/${id}/rate`, { rating }),

  // ── Platform staff queue management (Document 14 §7) ───────────────────
  // ticket:manage. The full cross-user queue — distinct from listMine above,
  // which every portal's own "my tickets" section uses.
  listAll: (params?: {
    page?: number | undefined;
    limit?: number | undefined;
    status?: string | undefined;
    category?: string | undefined;
    priority?: string | undefined;
    assignedTo?: string | undefined;
  }) => client.getPaginated<Record<string, unknown>>('/support/tickets', { params }),

  assign: (id: string, assigneeId: string) =>
    client.patch<Record<string, unknown>>(`/support/tickets/${id}/assign`, { assigneeId }),

  updateStatus: (id: string, status: string, resolution?: string) =>
    client.patch<Record<string, unknown>>(`/support/tickets/${id}/status`, {
      status,
      resolution,
    }),
};

export const universityApi = {
  getForm: (slug: string) =>
    client.get<Record<string, unknown>>(`/university/forms/${slug}/public`),
  submitApplication: (slug: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/university/forms/${slug}/apply`, input),
  getInvoice: (id: string) =>
    client.get<Record<string, unknown>>(`/university/invoices/${id}`),
  payInvoice: (id: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/university/invoices/${id}/pay`, input),
  getLease: (id: string) =>
    client.get<Record<string, unknown>>(`/university/leases/${id}`),
  signLease: (id: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/university/leases/${id}/sign`, input),
  getLeaseDocument: (id: string) =>
    `/api/v1/university/leases/${id}/document/download`,
};

export const paymentsApi = {
  listMine: () => client.get<Record<string, unknown>[]>('/customers/me/payments'),
  get: (id: string) => client.get<Record<string, unknown>>(`/payments/${id}`),
  payBookingBalance: (bookingId: string, input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>(`/payments/booking/${bookingId}`, input),
};
