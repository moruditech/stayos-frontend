// Agency Portal domain types.
// Verified against models/AgencyTenant.model.js, AgencyStaff.model.js,
// AgencySubscription.model.js, AgencyOnboarding.model.js,
// ManagementFeeRecord.model.js, and modules/agency/agency.service.js.

// Role is a plain literal union here rather than importing AgencyRole from
// @stayos/constants — this package has zero internal dependencies by design
// (Document 00 §9.2: "types/constants -> nothing internal"). The six values
// are mirrored from packages/constants/src/roles.ts; if that enum changes,
// this one needs updating too.
export type AgencyStaffRole =
  | 'agency_owner'
  | 'agency_manager'
  | 'agency_supervisor'
  | 'agency_reservations'
  | 'agency_housekeeper'
  | 'agency_maintenance';

// ── AgencyTenant (GET /agency/me) ──────────────────────────────────────────

export interface AgencyProfile {
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
  managedProperties: { _id: string; name: string; slug: string; type: string; status: string }[];
  approvedAt?: string | null;
  settings: {
    commissionEnabled: boolean;
    commissionPercent: number;
    ownerReadOnlyDefault: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// ── Portfolio (GET /agency/me/portfolio) ───────────────────────────────────
// service.getPortfolio's actual return shape — one row per PropertyMandate
// in pending/active/termination_notice, not one row per Tenant. A property
// whose mandate has fully terminated will not appear here even if it once
// did — that's intentional (§ agency.service.js getPortfolio).

export interface AgencyPortfolioProperty {
  mandateId: string;
  mandateStatus: 'pending' | 'active' | 'termination_notice' | 'terminated';
  startDate?: string;
  terminationDate: string | null;
  feeType: 'percentage' | 'fixed';
  feeValue: number;
  property: {
    _id: string;
    name: string;
    slug: string;
    type: string;
    address?: Record<string, string>;
    contactEmail?: string;
    agencyId?: string;
    activeMandateId?: string | null;
  } | null;
  occupiedTonight: number;
  currentMonthFeeRecord: {
    tenantId: string;
    grossRevenue: number;
    managementFeeAmount: number;
    netOwnerAmount: number;
    status: 'draft' | 'finalised';
  } | null;
}

export interface AgencyPortfolio {
  agency: { _id: string; name: string };
  properties: AgencyPortfolioProperty[];
  summary: {
    total: number;
    active: number;
    pending: number;
    termination_notice: number;
  };
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface AgencyAnalytics {
  activeBookings: number;
  totalRevenue: number;
  tenantCount: number;
}

export interface AgencyPropertyComparison {
  tenantId: string;
  tenantName: string;
  totalBookings: number;
  totalRevenue: number;
}

// ── Staff (AgencyStaff) ─────────────────────────────────────────────────────

export interface AgencyStaffMember {
  _id: string;
  agencyId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AgencyStaffRole;
  permissions: string[];
  assignedProperties: string[];
  isActive: boolean;
  inviteSentAt?: string;
  inviteAccepted: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Statements (ManagementFeeRecord) ───────────────────────────────────────

export interface AgencyStatement {
  _id: string;
  mandateId: string;
  tenantId: { _id: string; name: string } | string;
  agencyId: string;
  ownerId: string;
  period: string; // 'YYYY-MM'
  grossRevenue: number;
  managementFeeType: 'percentage' | 'fixed';
  managementFeeValue: number;
  managementFeeAmount: number;
  netOwnerAmount: number;
  status: 'draft' | 'finalised';
  finalisedAt?: string;
  statementPdfUrl?: string;
  isPartialMonth: boolean;
  periodStartDate?: string;
  periodEndDate?: string;
  createdAt: string;
}

// ── Billing (AgencySubscription) — the agency's own contract with StayOS,
// distinct from statements above (Document 13 §6). ─────────────────────────

export interface AgencyBilling {
  _id: string;
  agencyId: string;
  planType: 'agency_base' | 'agency_pro' | 'custom';
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  baseSeatFee: number;
  perPropertyFee: number;
  additionalStaffFee: number;
  includedStaffSeats: number;
  managedPropertyCount: number;
  totalActiveStaff: number;
  additionalStaffCount: number;
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  lastPaymentAt?: string;
  lastPaymentAmount?: number;
  failedPaymentCount: number;
}

// ── Onboarding wizard (AgencyOnboarding) ───────────────────────────────────

export interface AgencyOnboardingStep {
  stepNumber: number;
  stepName: string;
  isComplete: boolean;
  completedAt?: string;
  data?: Record<string, unknown>;
}

export interface AgencyOnboardingState {
  _id: string;
  agencyId: string;
  currentStep: number;
  totalSteps: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  steps: AgencyOnboardingStep[];
  agencyProfileComplete: boolean;
  billingSetup: boolean;
  firstPropertyLinked: boolean;
  staffAccountsCreated: boolean;
  completedAt?: string;
}
