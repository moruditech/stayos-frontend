import { client } from '../client';
import type {
  PlatformDashboard,
  PlatformTenant,
  PlatformAgency,
  RevenuePoint,
  PlatformSubscription,
  PlatformUserAccount,
  SubscriptionPlanAdmin,
  SubscriptionCouponAdmin,
  PlatformReferralAdmin,
  AuditLogEntry,
  PlatformAnalytics,
} from '@stayos/types';

export const platformApi = {
  // GET /platform/dashboard — platform:read
  getDashboard: () => client.get<PlatformDashboard>('/platform/dashboard'),

  // GET /platform/analytics — platform:read
  getAnalytics: () => client.get<PlatformAnalytics>('/platform/analytics'),

  // ── Tenants — tenant:manage ────────────────────────────────────────────
  listTenants: (params?: { page?: number | undefined; limit?: number | undefined; status?: string | undefined; type?: string | undefined; search?: string | undefined }) =>
    client.getPaginated<PlatformTenant>('/platform/tenants', { params }),
  getTenant: (id: string) => client.get<PlatformTenant>(`/platform/tenants/${id}`),
  updateTenantStatus: (id: string, status: string, reason?: string) =>
    client.patch<PlatformTenant>(`/platform/tenants/${id}/status`, { status, reason }),
  setTenantFeatured: (id: string, featured: boolean, featuredUntil?: string | null) =>
    client.patch<PlatformTenant>(`/platform/tenants/${id}/featured`, { featured, featuredUntil }),

  // ── Agencies — agency:manage ───────────────────────────────────────────
  listAgencies: (params?: { page?: number | undefined; limit?: number | undefined; status?: string | undefined; search?: string | undefined }) =>
    client.getPaginated<PlatformAgency>('/platform/agencies', { params }),
  getAgency: (id: string) => client.get<PlatformAgency>(`/platform/agencies/${id}`),
  updateAgencyStatus: (id: string, status: string) =>
    client.patch<PlatformAgency>(`/platform/agencies/${id}/status`, { status }),

  // ── Revenue — platform:finance:read ────────────────────────────────────
  getRevenue: (params?: { from?: string | undefined; to?: string | undefined; groupBy?: 'day' | 'month' }) =>
    client.get<RevenuePoint[]>('/platform/revenue', { params }),

  // ── Subscriptions — platform:finance:read ──────────────────────────────
  listSubscriptions: (params?: { page?: number | undefined; limit?: number | undefined; status?: string | undefined }) =>
    client.getPaginated<PlatformSubscription>('/platform/subscriptions', { params }),
  getSubscription: (id: string) => client.get<PlatformSubscription>(`/platform/subscriptions/${id}`),
  // POST /platform/subscriptions/:id/refund — '*' i.e. super_admin only.
  // RoleGate hides this action entirely for every other role (Document 14 §4) —
  // the call exists here so the one role that can see the button has
  // something real to call, not so every role can attempt and get rejected.
  refundSubscription: (id: string, amount: number, reason: string) =>
    client.post<{ message: string }>(`/platform/subscriptions/${id}/refund`, { amount, reason }),

  // ── Platform users — platform:users:manage ─────────────────────────────
  listUsers: (params?: { page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<PlatformUserAccount>('/platform/users', { params }),
  createUser: (input: Record<string, unknown>) =>
    client.post<PlatformUserAccount>('/platform/users', input),
  getUser: (id: string) => client.get<PlatformUserAccount>(`/platform/users/${id}`),
  updateUser: (id: string, input: Record<string, unknown>) =>
    client.patch<PlatformUserAccount>(`/platform/users/${id}`, input),
  deleteUser: (id: string) => client.delete<{ message: string }>(`/platform/users/${id}`),

  // ── Plans — platform:plans:manage ──────────────────────────────────────
  // Not paginated on the backend (SubscriptionPlan.find().sort() — a small,
  // bounded catalogue, unlike tenants/users/coupons).
  listPlans: () => client.get<SubscriptionPlanAdmin[]>('/platform/plans'),
  createPlan: (input: Record<string, unknown>) =>
    client.post<SubscriptionPlanAdmin>('/platform/plans', input),
  updatePlan: (id: string, input: Record<string, unknown>) =>
    client.patch<SubscriptionPlanAdmin>(`/platform/plans/${id}`, input),

  // ── Coupons — platform:coupons:manage ──────────────────────────────────
  listCoupons: (params?: { page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<SubscriptionCouponAdmin>('/platform/coupons', { params }),
  createCoupon: (input: Record<string, unknown>) =>
    client.post<SubscriptionCouponAdmin>('/platform/coupons', input),
  getCoupon: (id: string) => client.get<SubscriptionCouponAdmin>(`/platform/coupons/${id}`),
  updateCoupon: (id: string, input: Record<string, unknown>) =>
    client.patch<SubscriptionCouponAdmin>(`/platform/coupons/${id}`, input),
  // Soft-deactivates (isActive: false) — never a hard delete. See
  // deactivateCoupon in platform.controller.js.
  deactivateCoupon: (id: string) => client.delete<SubscriptionCouponAdmin>(`/platform/coupons/${id}`),

  // ── Referrals — platform:read (list) / '*' (reward) ────────────────────
  listReferrals: (params?: { page?: number | undefined; limit?: number | undefined; status?: string | undefined }) =>
    client.getPaginated<PlatformReferralAdmin>('/platform/referrals', { params }),
  // super_admin only — see refundSubscription note above, same pattern.
  rewardReferral: (id: string, invoiceId?: string) =>
    client.patch<PlatformReferralAdmin>(`/platform/referrals/${id}/reward`, { invoiceId }),

  // ── Audit logs — platform:audit:read ───────────────────────────────────
  getAuditLogs: (params?: {
    page?: number | undefined;
    limit?: number | undefined;
    action?: string | undefined;
    actorId?: string | undefined;
    resourceType?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
  }) => client.getPaginated<AuditLogEntry>('/platform/audit-logs', { params }),
};
