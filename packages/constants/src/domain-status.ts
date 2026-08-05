// Status enums confirmed directly against utils/constants.js on the backend
// (TENANT_STATUS, TENANT_STATUS_TRANSITIONS, AGENCY_STATUS) and against the
// relevant Mongoose model enums for domains constants.js doesn't centralize
// (OnboardingApplication, SupportTicket, SubscriptionCoupon, PlatformReferral).
// Same rule as the rest of this package: a value used in the UI that isn't
// listed here is a defect, not a stopgap — add it here first.

export const TENANT_STATUS = {
  PENDING_VETTING: 'pending_vetting',
  PENDING_SETUP: 'pending_setup',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
} as const;
export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

// Allowed next statuses per current status — mirrors TENANT_STATUS_TRANSITIONS
// exactly. Drives which options the platform admin's status-change control
// offers; submitting anything outside this map 422s as TRANSITION_INVALID,
// so the frontend only ever offers a valid transition rather than showing
// every status and letting the backend reject the illegal ones.
export const TENANT_STATUS_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  pending_vetting: ['pending_setup', 'active', 'closed'],
  pending_setup: ['active', 'closed'],
  active: ['suspended', 'closed'],
  suspended: ['active', 'closed'],
  closed: [],
};

export const AGENCY_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
} as const;
export type AgencyStatus = (typeof AGENCY_STATUS)[keyof typeof AGENCY_STATUS];

// OnboardingApplication.status — verified against the model directly.
export const ONBOARDING_APPLICATION_STATUS = {
  STARTED: 'started',
  DOCUMENTS_SUBMITTED: 'documents_submitted',
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUESTED: 'documents_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;
export type OnboardingApplicationStatusValue =
  (typeof ONBOARDING_APPLICATION_STATUS)[keyof typeof ONBOARDING_APPLICATION_STATUS];

// SupportTicket enums — verified against the model directly.
export const SUPPORT_TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING_USER: 'pending_user',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
export type SupportTicketStatusValue = (typeof SUPPORT_TICKET_STATUS)[keyof typeof SUPPORT_TICKET_STATUS];

export const SUPPORT_TICKET_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;
export type SupportTicketPriorityValue =
  (typeof SUPPORT_TICKET_PRIORITY)[keyof typeof SUPPORT_TICKET_PRIORITY];

export const SUPPORT_TICKET_CATEGORY = {
  BILLING: 'billing',
  BOOKING: 'booking',
  TECHNICAL: 'technical',
  COMPLAINT: 'complaint',
  ACCOUNT: 'account',
  OTHER: 'other',
} as const;

// Review.status — verified against the model directly.
export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
} as const;
export type ReviewStatusValue = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

// SubscriptionCoupon.discountType — verified against the model directly.
export const COUPON_DISCOUNT_TYPE = {
  PERCENT: 'percent',
  FIXED_MONTHLY: 'fixed_monthly',
} as const;

// PlatformReferral.status — verified against the model directly.
export const PLATFORM_REFERRAL_STATUS = {
  PENDING: 'pending',
  SIGNED_UP: 'signed_up',
  FIRST_PAYMENT_MADE: 'first_payment_made',
  REWARDED: 'rewarded',
  EXPIRED: 'expired',
} as const;

// SubscriptionPlan.tier — verified against the model directly. Grouped by
// targetType since a plan-create form filters this list by the targetType
// radio selection rather than showing all ten at once.
export const PLAN_TIERS_BY_TARGET: Record<string, string[]> = {
  property: ['starter', 'growth', 'pro', 'enterprise'],
  pbsa: ['pbsa_starter', 'pbsa_growth', 'pbsa_pro', 'pbsa_enterprise'],
  agency: ['agency_base', 'agency_pro'],
  addon: ['addon'],
};

// AgencySubscription.status — verified against the model directly (Document
// 13 §6 billing page).
export const AGENCY_SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const;

// ManagementFeeRecord.status — verified against the model directly
// (Document 13 §6 statements page).
export const STATEMENT_STATUS = {
  DRAFT: 'draft',
  FINALISED: 'finalised',
} as const;
