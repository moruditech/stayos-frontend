// Every role list below is verified directly against ROLE_PERMISSIONS in
// the backend's utils/constants.js. A constant used at a gate site that
// isn't in this file is a defect, not a stopgap — do not add a role from
// naming convention.

// ── Property-scoped roles ───────────────────────────────────────────────
export const PROPERTY_ROLES = {
  PROPERTY_OWNER: 'property_owner',
  PROPERTY_ADMIN: 'property_admin',
  PROPERTY_MANAGER: 'property_manager',
  FRONT_DESK_MANAGER: 'front_desk_manager',
  RECEPTIONIST: 'receptionist',
  REVENUE_MANAGER: 'revenue_manager',
  HR_MANAGER: 'hr_manager',
  HOUSEKEEPER_SUPERVISOR: 'housekeeper_supervisor',
  HOUSEKEEPER: 'housekeeper',
  KITCHEN_STAFF: 'kitchen_staff',
  MAINTENANCE_SUPERVISOR: 'maintenance_supervisor',
  MAINTENANCE_TECHNICIAN: 'maintenance_technician',
  PROPERTY_ACCOUNTANT: 'property_accountant',
  PROPERTY_OWNER_VIEW: 'property_owner_view',
} as const;
export type PropertyRole = (typeof PROPERTY_ROLES)[keyof typeof PROPERTY_ROLES];

// ── Agency-scoped roles ──────────────────────────────────────────────────
// NOTE: `agency_analyst` and a duplicate `property_owner_view` entry exist
// in the backend's ROLE_PERMISSIONS but are explicitly commented there as
// legacy aliases scheduled for removal. Deliberately excluded here —
// building against roles the backend intends to delete creates exactly
// the drift this package exists to prevent.
export const AGENCY_ROLES = {
  AGENCY_OWNER: 'agency_owner',
  AGENCY_MANAGER: 'agency_manager',
  AGENCY_SUPERVISOR: 'agency_supervisor',
  AGENCY_RESERVATIONS: 'agency_reservations',
  AGENCY_HOUSEKEEPER: 'agency_housekeeper',
  AGENCY_MAINTENANCE: 'agency_maintenance',
} as const;
export type AgencyRole = (typeof AGENCY_ROLES)[keyof typeof AGENCY_ROLES];

// ── Platform-scoped roles ────────────────────────────────────────────────
export const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  SUPPORT: 'support',
  MARKETING: 'marketing',
  VETTING_OFFICER: 'vetting_officer',
} as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

// ── Customer-scoped roles ────────────────────────────────────────────────
// `PARENT_GUARDIAN` is included for completeness against ROLE_PERMISSIONS,
// but is currently UNREACHABLE: `deriveCustomerRole()` (the only place a
// customer's role is ever assigned, from `Customer.studentType`) never
// produces this value, and no other route or model creates a customer
// with it. Do not build a parent-guardian login path or portal experience
// assuming it's reachable today — that would need a backend feature
// request first.
export const CUSTOMER_ROLES = {
  GUEST: 'guest',
  STUDENT_SELF_PAYING: 'student_self_paying',
  STUDENT_BURSARY: 'student_bursary',
  PARENT_GUARDIAN: 'parent_guardian', // unreachable today — see note above
} as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[keyof typeof CUSTOMER_ROLES];
