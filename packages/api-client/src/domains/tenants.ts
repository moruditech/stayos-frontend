import { client } from '../client';
import type { PropertySessionBootstrap, Tenant, TenantAddonSubscription } from '@stayos/types';

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

  // GET /properties/me/subscription — billing:manage. features on the
  // returned planId now resolve through the same function checkPlanFeature
  // uses (add-ons, PBSA-implied, agency-mandate), not raw plan.features.
  getSubscription: () =>
    client.get<Record<string, unknown>>('/properties/me/subscription'),

  // POST /properties/me/subscription/upgrade — billing:manage. Backend route
  // already existed; nothing on the frontend ever called it before.
  upgradeSubscription: (planId: string) =>
    client.post<Record<string, unknown>>('/properties/me/subscription/upgrade', { planId }),

  // POST /properties/me/subscription/cancel — billing:manage. Same as above —
  // the backend route already existed and worked.
  cancelSubscription: (reason?: string) =>
    client.post<Record<string, unknown>>('/properties/me/subscription/cancel', { reason }),

  // ── Own add-on subscriptions ────────────────────────────────────────────
  // Read + self-cancel only — granting a new add-on stays a platform-admin
  // action (see restaurantOutlets-adjacent platform.* functions), since it's
  // a billing decision (price, term) nothing here collects from a tenant
  // directly yet.
  listMyAddons: () =>
    client.get<TenantAddonSubscription[]>('/properties/me/addons'),

  cancelMyAddon: (addonId: string, cancellationReason: string) =>
    client.patch<TenantAddonSubscription>(`/properties/me/addons/${addonId}/cancel`, { cancellationReason }),

  // GET /subscriptions/plans — public, lists hospitality/PBSA plans available
  // to upgrade into. Lives in the separate subscriptions module on the
  // backend (not /properties/*), included here since this is the only
  // place on the frontend that needs it. Loosely typed to match the
  // existing getDashboard/getOnboarding convention in this same file.
  listAvailablePlans: () =>
    client.get<Record<string, unknown>[]>('/subscriptions/plans'),
};
