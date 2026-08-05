// All React Query cache keys for the Customer Portal.
// Socket event handlers and data-layer hooks must use the same key
// builders from this file — a handler reconstructing the key inline
// instead of using these builders will miss the invalidation.

export const accommodationKeys = {
  list: (filters?: Record<string, unknown>) => ['accommodation', 'list', filters ?? {}] as const,
  detail: (slug: string) => ['accommodation', 'detail', slug] as const,
  rooms: (slug: string, params?: Record<string, unknown>) => ['accommodation', 'rooms', slug, params ?? {}] as const,
  availability: (slug: string, params?: Record<string, unknown>) => ['accommodation', 'availability', slug, params ?? {}] as const,
  reviews: (slug: string, page?: number) => ['accommodation', 'reviews', slug, page ?? 1] as const,
};

export const bookingKeys = {
  list: () => ['customer', 'bookings'] as const,
  detail: (id: string) => ['customer', 'bookings', id] as const,
};

export const applicationKeys = {
  list: () => ['customer', 'applications'] as const,
  detail: (id: string) => ['customer', 'applications', id] as const,
};

export const paymentKeys = {
  list: () => ['customer', 'payments'] as const,
  detail: (id: string) => ['customer', 'payments', id] as const,
};

export const invoiceKeys = {
  list: () => ['customer', 'invoices'] as const,
  detail: (id: string) => ['customer', 'invoices', id] as const,
};

export const leaseKeys = {
  list: () => ['customer', 'leases'] as const,
  detail: (id: string) => ['customer', 'leases', id] as const,
};

export const loyaltyKeys = {
  balance: () => ['customer', 'loyalty'] as const,
  history: () => ['customer', 'loyalty', 'history'] as const,
};

export const notificationKeys = {
  list: () => ['customer', 'notifications'] as const,
  unreadCount: () => ['customer', 'notifications', 'unread-count'] as const,
};

export const profileKeys = {
  me: () => ['customer', 'me'] as const,
};
