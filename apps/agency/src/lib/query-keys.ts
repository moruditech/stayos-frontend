export const agencyKeys = {
  profile: () => ['agency', 'profile'] as const,
  portfolio: () => ['agency', 'portfolio'] as const,
  properties: () => ['agency', 'properties'] as const,
  analytics: (params?: Record<string, unknown>) => ['agency', 'analytics', params ?? {}] as const,
  compareAnalytics: () => ['agency', 'analytics', 'compare'] as const,
  billing: () => ['agency', 'billing'] as const,
  billingInvoices: () => ['agency', 'billing', 'invoices'] as const,
  onboarding: () => ['agency', 'onboarding'] as const,
};

export const mandateKeys = {
  list: (params?: Record<string, unknown>) => ['mandates', params ?? {}] as const,
  detail: (id: string) => ['mandates', 'detail', id] as const,
};

export const agencyStaffKeys = {
  list: (params?: Record<string, unknown>) => ['agency-staff', params ?? {}] as const,
  detail: (id: string) => ['agency-staff', 'detail', id] as const,
  properties: (id: string) => ['agency-staff', 'detail', id, 'properties'] as const,
};

export const statementKeys = {
  list: (params?: Record<string, unknown>) => ['statements', params ?? {}] as const,
};

export const agencySupportKeys = {
  mine: (params?: Record<string, unknown>) => ['agency-support', 'mine', params ?? {}] as const,
  detail: (id: string) => ['agency-support', 'detail', id] as const,
};
