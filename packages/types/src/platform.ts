// Platform Admin Portal domain types.
// Verified against modules/platform/platform.service.js + .controller.js,
// models/SubscriptionPlan.model.js, SubscriptionCoupon.model.js,
// PlatformReferral.model.js, PlatformUser.model.js, AuditLog.model.js,
// Tenant.model.js.

import type { Tenant } from './tenant';

// ── Dashboard (GET /platform/dashboard) ────────────────────────────────────
// This is the endpoint's actual, confirmed shape — deliberately narrow.
// getDashboard() does NOT compute MRR, churn, or a subscriptions-by-plan
// breakdown; those are composed on the dashboard page from other endpoints
// (getRevenue, listSubscriptions) rather than invented here. `activeTenants`
// is what the dashboard calls its tenant count — it counts status==='active'
// only, not every tenant regardless of status.
export interface PlatformDashboard {
  activeTenants: number;
  pendingVetting: number;
  todayRevenue: number;
  newTenantsThisMonth: number;
  activeSubscriptions: number;
}

// ── Tenants (GET /platform/tenants, GET /platform/tenants/:id) ────────────
// Tenant is the full shape from @stayos/types tenant.ts — the platform list/
// detail views populate planId + agencyId exactly like the property session
// bootstrap does.
export type PlatformTenant = Tenant & {
  isFeatured?: boolean;
  featuredUntil?: string | null;
  contactEmail?: string;
};

// ── Agencies (GET /platform/agencies, GET /platform/agencies/:id) ─────────
export interface PlatformAgency {
  _id: string;
  name: string;
  type: 'agency' | 'owner_portfolio';
  slug: string;
  registrationNumber?: string;
  taxNumber?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  managedProperties: string[];
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Revenue (GET /platform/revenue) ────────────────────────────────────────
// Raw Payment aggregate, grouped by day or month — a time series, not a
// pre-computed MRR/churn breakdown (the backend has no subscription-events
// ledger to compute churn from). The Revenue page derives "revenue this
// range" and "average per period" from this series client-side; it does not
// display invented churn/new-revenue figures the backend can't support.
export interface RevenuePoint {
  _id: { year: number; month: number; day?: number };
  total: number;
  count: number;
  byGateway: { gateway: string; amount: number }[];
}

// ── Subscriptions (GET /platform/subscriptions, /:id) ─────────────────────
export interface PlatformSubscription {
  _id: string;
  tenantId: { _id: string; name: string; slug: string; contactEmail?: string } | null;
  planId: { _id: string; name: string; tier: string; monthlyPrice: number } | null;
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  billingCycle?: 'monthly' | 'annual';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  createdAt: string;
}

// ── Platform users (GET/POST /platform/users, GET/PATCH/DELETE /:id) ──────
export interface PlatformUserAccount {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'super_admin' | 'admin' | 'accountant' | 'support' | 'marketing' | 'vetting_officer';
  permissions: string[];
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

// ── Subscription plans (GET/POST /platform/plans, PATCH /:id) ─────────────
export type PlanTier =
  | 'starter' | 'growth' | 'pro' | 'enterprise'
  | 'pbsa_starter' | 'pbsa_growth' | 'pbsa_pro' | 'pbsa_enterprise'
  | 'agency_base' | 'agency_pro'
  | 'addon';

export type PlanTargetType = 'property' | 'pbsa' | 'agency' | 'addon';

export interface SubscriptionPlanAdmin {
  _id: string;
  name: string;
  slug: string;
  tier: PlanTier;
  targetType: PlanTargetType;
  description?: string;
  monthlyPrice: number;
  annualMonthlyPrice?: number;
  sixMonthMonthlyPrice?: number;
  currency: string;
  roomLimit?: number | null;
  propertyStaffLimit?: number | null;
  bedLimit?: number | null;
  isAddon: boolean;
  addonBaseBeds?: number | null;
  addonPerBedBlock?: number | null;
  addonBedBlockSize?: number;
  isAgencyPlan: boolean;
  agencyBaseSeats?: number | null;
  perPropertyPrice?: number | null;
  additionalStaffPrice?: number | null;
  bundleDiscounts?: { minProperties: number; discountPercent: number }[];
  features: string[];
  onboardingFee: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  trialDays: number;
}

// ── Coupons (GET/POST /platform/coupons, GET/PATCH/DELETE /:id) ───────────
export interface SubscriptionCouponAdmin {
  _id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed_monthly';
  discountValue: number;
  applicablePlanTiers: string[];
  applicableTargetTypes: string[];
  durationMonths: number | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  maxRedemptionsPerTenant: number;
  isActive: boolean;
  expiresAt: string | null;
  eligibilityNote?: string;
  requiresVerification: boolean;
  createdBy: { _id: string; firstName: string; lastName: string } | string;
  createdAt: string;
}

// ── Platform referrals (GET /platform/referrals, PATCH /:id/reward) ───────
export interface PlatformReferralAdmin {
  _id: string;
  referrerTenantId: { _id: string; name: string } | null;
  referrerAgencyId: string | null;
  referrerStaffId: string;
  code: string;
  referredEmail?: string;
  referredTenantId: { _id: string; name: string } | null;
  status: 'pending' | 'signed_up' | 'first_payment_made' | 'rewarded' | 'expired';
  rewardAmount: number;
  rewardCurrency: string;
  rewardAppliedAt?: string;
  signedUpAt?: string;
  firstPaymentAt?: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
}

// ── Audit logs (GET /platform/audit-logs) ──────────────────────────────────
export interface AuditLogEntry {
  _id: string;
  tenantId?: string | null;
  agencyId?: string | null;
  actorId?: string | null;
  actorModel?: 'PlatformUser' | 'PropertyStaff' | 'AgencyStaff' | 'Customer' | 'System';
  actorRole?: string;
  actorIp?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ── Analytics (GET /platform/analytics) ────────────────────────────────────
export interface PlatformAnalytics {
  tenantsByType: { _id: string; count: number }[];
  revenueByGateway: { _id: string; total: number; count: number }[];
  newTenantsLast30Days: number;
}
