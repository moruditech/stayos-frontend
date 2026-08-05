export type { ApiResponse, ApiErrorResponse, ApiErrorPayload, ApiFieldError, ApiEnvelope, Pagination } from './api';
export type { Scope, AccessMode, DecodedAccessToken, PropertySessionBootstrap, Session } from './session';
export type { Booking, CreateBookingInput, UpdateBookingInput, BookingFilters } from './booking';
export type { Room, RoomImage, RoomBlock } from './room';
export type { Folio, FolioLineItem } from './folio';
export type { Tenant } from './tenant';
export type { PropertyMandate, MandateStatus } from './mandate';
export type { DataSharingConsent } from './data-sharing-consent';

// Phase 5 — Agency Portal + Platform Admin Portal
export type {
  AgencyStaffRole,
  AgencyProfile,
  AgencyPortfolio,
  AgencyPortfolioProperty,
  AgencyAnalytics,
  AgencyPropertyComparison,
  AgencyStaffMember,
  AgencyStatement,
  AgencyBilling,
  AgencyOnboardingState,
  AgencyOnboardingStep,
} from './agency';
export type {
  PlatformDashboard,
  PlatformTenant,
  PlatformAgency,
  RevenuePoint,
  PlatformSubscription,
  PlatformUserAccount,
  PlanTier,
  PlanTargetType,
  SubscriptionPlanAdmin,
  SubscriptionCouponAdmin,
  PlatformReferralAdmin,
  AuditLogEntry,
  PlatformAnalytics,
} from './platform';
export type {
  OnboardingApplicantType,
  OnboardingApplicationStatus,
  OnboardingRequiredDocument,
  OnboardingApplication,
  VettingDocument,
} from './onboarding';
export type {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketMessage,
  SupportTicket,
} from './support';
export type { ReviewStatus, ReviewForModeration } from './review';
