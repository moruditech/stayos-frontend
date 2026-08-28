// Every string below was extracted directly from a checkPermission('...')
// call in an actual backend *.routes.js file — not inferred from a
// resource name or REST convention. RoleGate's `perm` prop must only ever
// receive one of these (Document 03 §0 — gating on permission strings,
// not role identity, is the whole point of this file existing).
//
// A permission string used at a gate site that isn't listed here is a
// defect: either it doesn't exist on the backend (the gate can never
// pass) or it exists and needs adding here first.

export const PERMISSIONS = {
  WILDCARD: '*', // satisfies everything — super_admin only

  ACCESS_MANAGE: 'access:manage',

  AGENCY_ALL: 'agency:*',
  AGENCY_MANAGE: 'agency:manage',

  ANALYTICS_READ: 'analytics:read',

  ASSET_ALL: 'asset:*',
  ASSET_READ: 'asset:read',

  AVAILABILITY_READ: 'availability:read',

  BILLING_MANAGE: 'billing:manage',

  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_CREATE: 'booking:create',
  BOOKING_MANAGE: 'booking:manage',
  BOOKING_READ: 'booking:read',

  CHANNEL_MANAGE: 'channel:manage',

  CHECKIN_PROCESS: 'checkin:process',
  CHECKIN_ALL: 'checkin:*',

  COMPLAINT_MANAGE: 'complaint:manage',

  CONTENT_MANAGE: 'content:manage',

  EXPENSE_APPROVE: 'expense:approve',
  EXPENSE_MANAGE: 'expense:manage',

  FOLIO_MANAGE: 'folio:manage',
  FOLIO_READ: 'folio:read',

  GUEST_MANAGE: 'guest:manage',

  HOUSEKEEPING_ALL: 'housekeeping:*',
  HOUSEKEEPING_TASK_READ: 'housekeeping:task:read',
  HOUSEKEEPING_TASK_UPDATE: 'housekeeping:task:update',

  HR_PROFILE_MANAGE: 'hr:profile:manage',
  HR_DOCUMENT_MANAGE: 'hr:document:manage',
  HR_DISCIPLINARY_MANAGE: 'hr:disciplinary:manage',
  HR_PROBATION_MANAGE: 'hr:probation:manage',

  INSTAY_ORDER_FULFILLMENT_UPDATE: 'instay_order:fulfillment:update',
  INSTAY_ORDER_READ: 'instay_order:read',

  MAINTENANCE_ALL: 'maintenance:*',
  MAINTENANCE_TASK_READ: 'maintenance:task:read',
  MAINTENANCE_TASK_UPDATE: 'maintenance:task:update',

  MESSAGING_MANAGE: 'messaging:manage',

  ONBOARDING_READ: 'onboarding:read',

  PAYMENT_MANAGE: 'payment:manage',
  PAYMENT_READ: 'payment:read',

  PAYROLL_EXPORT_READ: 'payroll_export:read',

  PETTYCASH_MANAGE: 'pettycash:manage',

  PLATFORM_AUDIT_READ: 'platform:audit:read',
  PLATFORM_COUPONS_MANAGE: 'platform:coupons:manage',
  PLATFORM_FINANCE_READ: 'platform:finance:read',
  PLATFORM_PLANS_MANAGE: 'platform:plans:manage',
  PLATFORM_READ: 'platform:read',
  PLATFORM_USERS_MANAGE: 'platform:users:manage',

  PROCUREMENT_MANAGE: 'procurement:manage',

  PROMOTION_MANAGE: 'promotion:manage',

  // property:* is CONFIRMED to satisfy only the `property` namespace — it
  // does NOT grant booking:*, room:*, folio:*, or any other operational
  // permission, despite property_owner holding it. See Document 03 §2.1;
  // this is a confirmed backend behavior, not a frontend assumption.
  PROPERTY_ALL: 'property:*',
  PROPERTY_MANAGE: 'property:manage',
  PROPERTY_READ: 'property:read',

  RATE_ALL: 'rate:*',

  REPORT_EXPORT: 'report:export',
  REPORT_FINANCE_READ: 'report:finance:read',
  REPORT_READ: 'report:read',
  REPORT_REVENUE_READ: 'report:revenue:read',

  ROOM_MANAGE: 'room:manage',
  ROOM_READ: 'room:read',
  ROOM_STATUS_WRITE: 'room:status:write',

  STAFF_MANAGE: 'staff:manage',
  STAFF_PERMISSIONS_MANAGE: 'staff:permissions:manage',
  STAFF_ROSTER_MANAGE: 'staff:roster:manage',

  TENANT_MANAGE: 'tenant:manage',

  TICKET_MANAGE: 'ticket:manage',

  VETTING_MANAGE: 'vetting:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
