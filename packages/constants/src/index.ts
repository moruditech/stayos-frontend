export { SCOPES } from './scopes';
export type { Scope } from './scopes';

export { PROPERTY_ROLES, AGENCY_ROLES, PLATFORM_ROLES, CUSTOMER_ROLES } from './roles';
export type { PropertyRole, AgencyRole, PlatformRole, CustomerRole } from './roles';

export { AGENCY_TO_PROPERTY_ROLE, UNRESTRICTED_AGENCY_ROLES } from './agency-role-mapping';

export { ACCESS_MODE, MANDATE_STATUS } from './access';
export type { AccessMode, MandateStatus } from './access';

export { PLAN_FEATURES } from './plan-features';
export type { PlanFeature } from './plan-features';

export { PERMISSIONS } from './permissions';
export type { Permission } from './permissions';

export { SOCKET_EVENTS } from './socket-events';
export type { SocketEvent } from './socket-events';

export {
  TENANT_STATUS,
  TENANT_STATUS_TRANSITIONS,
  AGENCY_STATUS,
  ONBOARDING_APPLICATION_STATUS,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_CATEGORY,
  REVIEW_STATUS,
  COUPON_DISCOUNT_TYPE,
  PLATFORM_REFERRAL_STATUS,
  PLAN_TIERS_BY_TARGET,
  AGENCY_SUBSCRIPTION_STATUS,
  STATEMENT_STATUS,
} from './domain-status';
export type {
  TenantStatus,
  AgencyStatus,
  OnboardingApplicationStatusValue,
  SupportTicketStatusValue,
  SupportTicketPriorityValue,
  ReviewStatusValue,
} from './domain-status';
