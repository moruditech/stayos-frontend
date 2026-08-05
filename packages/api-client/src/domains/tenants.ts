import { client } from '../client';
import type { PropertySessionBootstrap, Tenant } from '@stayos/types';

export const tenantsApi = {
  // GET /properties/me — session bootstrap for tenant-scoped sessions.
  // Response is the Tenant document FLAT — not nested under a `tenant` key.
  // See @stayos/types session.ts#PropertySessionBootstrap for the verified shape.
  getMe: () => client.get<PropertySessionBootstrap>('/properties/me'),

  // PATCH /properties/me — update property profile
  updateMe: (input: Partial<Tenant>) =>
    client.patch<Tenant>('/properties/me', input),

  // GET /properties/me/dashboard — dashboard summary metrics
  getDashboard: () =>
    client.get<Record<string, unknown>>('/properties/me/dashboard'),

  // GET /properties/me/onboarding
  getOnboarding: () =>
    client.get<Record<string, unknown>>('/properties/me/onboarding'),

  // PATCH /properties/me/onboarding/:step
  updateOnboardingStep: (step: string, data: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/properties/me/onboarding/${step}`, data),

  // GET /properties/me/subscription
  getSubscription: () =>
    client.get<Record<string, unknown>>('/properties/me/subscription'),
};
