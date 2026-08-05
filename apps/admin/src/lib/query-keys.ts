export const platformKeys = {
  dashboard: () => ['platform', 'dashboard'] as const,
  tenants: (filters?: Record<string, unknown>) => ['platform', 'tenants', filters ?? {}] as const,
  tenant: (id: string) => ['platform', 'tenant', id] as const,
  agencies: (filters?: Record<string, unknown>) => ['platform', 'agencies', filters ?? {}] as const,
  agency: (id: string) => ['platform', 'agency', id] as const,
  revenue: (params?: Record<string, unknown>) => ['platform', 'revenue', params ?? {}] as const,
  subscriptions: (params?: Record<string, unknown>) => ['platform', 'subscriptions', params ?? {}] as const,
  subscription: (id: string) => ['platform', 'subscription', id] as const,
  users: (params?: Record<string, unknown>) => ['platform', 'users', params ?? {}] as const,
  user: (id: string) => ['platform', 'user', id] as const,
  plans: () => ['platform', 'plans'] as const,
  coupons: (params?: Record<string, unknown>) => ['platform', 'coupons', params ?? {}] as const,
  coupon: (id: string) => ['platform', 'coupon', id] as const,
  referrals: (params?: Record<string, unknown>) => ['platform', 'referrals', params ?? {}] as const,
  auditLogs: (params?: Record<string, unknown>) => ['platform', 'audit-logs', params ?? {}] as const,
  analytics: () => ['platform', 'analytics'] as const,
};

export const vettingKeys = {
  pending: (params?: Record<string, unknown>) => ['vetting', 'pending', params ?? {}] as const,
  applications: (params?: Record<string, unknown>) => ['vetting', 'applications', params ?? {}] as const,
  application: (id: string) => ['vetting', 'application', id] as const,
  documents: (id: string) => ['vetting', 'application', id, 'documents'] as const,
};

export const supportKeys = {
  tickets: (params?: Record<string, unknown>) => ['support', 'tickets', params ?? {}] as const,
  ticket: (id: string) => ['support', 'ticket', id] as const,
  messages: (ticketId: string) => ['support', 'messages', ticketId] as const,
};

export const moderationKeys = {
  reviews: (params?: Record<string, unknown>) => ['moderation', 'reviews', params ?? {}] as const,
};
