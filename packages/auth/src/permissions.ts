// This module mirrors the backend's checkPermission.js exactly:
//   effective = (ROLE_PERMISSIONS[role] ∪ grantedPermissions) − deniedPermissions
// then evaluates a required permission against that set using the same
// wildcard rules as _evaluate().
//
// CRITICAL: This is NOT a security control — the backend is. This is a UX
// measure so the frontend doesn't render controls the user can't use.
// Any divergence between this logic and checkPermission.js is a bug.
//
// The wildcard rules, verified directly against checkPermission.js:
//   '*'           → satisfies everything
//   direct match  → satisfies itself
//   'ns:*'        → satisfies any 'ns:anything' permission
//   'property:*'  → satisfies only the 'property' namespace (NOT booking:*, room:*, etc.)
//                   despite property_owner holding it. This is a confirmed backend
//                   behavior, not a restriction added here.

// ROLE_PERMISSIONS is transcribed from utils/constants.js and kept in sync
// manually. A mismatch here causes RoleGate to diverge from backend enforcement.
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ── Platform ──────────────────────────────────────────────────────────
  super_admin: ['*'],
  admin: [
    'platform:read', 'tenant:manage', 'agency:manage', 'support:manage',
    'content:manage', 'platform:users:manage', 'platform:plans:manage',
    'platform:coupons:manage', 'platform:audit:read',
  ],
  accountant: ['platform:finance:read', 'report:export', 'subscription:read'],
  support: ['tenant:read', 'booking:read', 'complaint:manage', 'ticket:manage'],
  marketing: ['listing:manage', 'promotion:create', 'content:manage'],
  vetting_officer: ['onboarding:read', 'onboarding:review', 'vetting:manage'],

  // ── Agency ────────────────────────────────────────────────────────────
  agency_owner: [
    'agency:*', 'property:*', 'report:read', 'billing:manage',
    'staff:manage', 'channel:manage',
  ],
  agency_manager: [
    'agency:*', 'property:*', 'booking:*', 'room:*', 'guest:manage',
    'report:read', 'housekeeping:*', 'maintenance:*', 'folio:*',
    'staff:manage', 'channel:manage',
  ],
  agency_supervisor: [
    'property:read', 'booking:*', 'room:*', 'guest:manage',
    'report:read', 'housekeeping:*', 'maintenance:*', 'folio:*',
  ],
  agency_reservations: [
    'property:read', 'booking:*', 'room:status:write', 'guest:manage',
    'folio:manage', 'checkin:*', 'payment:read',
  ],
  agency_housekeeper: ['property:read', 'housekeeping:*', 'room:status:write'],
  agency_maintenance: ['property:read', 'maintenance:*'],

  // ── Property ──────────────────────────────────────────────────────────
  property_owner: [
    'property:*',
    'staff:manage', 'staff:permissions:manage', 'payroll_export:read',
    'access:manage', 'procurement:manage',
    'expense:approve', 'pettycash:manage', 'channel:manage',
  ],
  property_admin: [
    'booking:*', 'room:*', 'staff:manage', 'staff:permissions:manage',
    'guest:manage', 'report:read', 'housekeeping:*', 'maintenance:*',
    'folio:*', 'payment:read', 'payroll_export:read', 'procurement:manage',
    'expense:approve', 'access:manage', 'complaint:manage', 'messaging:manage',
    'channel:manage',
  ],
  property_manager: [
    'booking:*', 'room:*', 'guest:manage', 'report:read',
    'housekeeping:*', 'maintenance:*', 'folio:*', 'payment:read',
    'payroll_export:read', 'procurement:manage', 'expense:approve',
    'access:manage', 'complaint:manage', 'messaging:manage',
  ],
  front_desk_manager: [
    'booking:*', 'room:status:write', 'guest:manage', 'folio:manage',
    'checkin:*', 'report:basic:read', 'staff:roster:manage',
    'access:manage', 'complaint:manage', 'messaging:manage',
  ],
  receptionist: [
    'booking:create', 'booking:read', 'checkin:process',
    'guest:read', 'folio:read', 'access:manage', 'messaging:read',
  ],
  revenue_manager: ['rate:*', 'availability:*', 'report:revenue:read', 'promotion:manage'],
  hr_manager: [
    'staff:read', 'staff:create', 'hr:profile:manage', 'hr:document:manage',
    'hr:disciplinary:manage', 'hr:probation:manage', 'payroll_export:read',
    'staff:roster:manage', 'timeclock:read',
  ],
  housekeeper_supervisor: ['housekeeping:*', 'staff:roster:manage', 'procurement:read'],
  housekeeper: ['housekeeping:task:read', 'housekeeping:task:update'],
  kitchen_staff: ['instay_order:read', 'instay_order:fulfillment:update'],
  maintenance_supervisor: ['maintenance:*', 'asset:*', 'staff:roster:manage'],
  maintenance_technician: ['maintenance:task:read', 'maintenance:task:update'],
  property_accountant: [
    'payment:read', 'folio:read', 'report:finance:read', 'report:export',
    'payroll_export:read', 'expense:manage', 'pettycash:manage',
  ],
  property_owner_view: ['property:read', 'report:read', 'booking:read'],

  // ── Customer ──────────────────────────────────────────────────────────
  guest: ['booking:self:*', 'complaint:self:*', 'review:self:create', 'loyalty:self:read', 'customer:self:*'],
  student_self_paying: ['student:application:*', 'student:invoice:pay', 'student:document:read', 'complaint:self:*', 'customer:self:*'],
  student_bursary: ['student:application:*', 'student:invoice:read', 'student:document:read', 'complaint:self:*', 'customer:self:*'],
  parent_guardian: ['student:report:read', 'student:invoice:read'],
};

// ── _evaluate() ───────────────────────────────────────────────────────────────
// Exact mirror of checkPermission.js#_evaluate(). Do not modify the wildcard
// logic without updating the backend counterpart.
function evaluate(effectivePerms: string[], required: string): boolean {
  if (effectivePerms.includes('*')) return true;
  if (effectivePerms.includes(required)) return true;

  const ns = required.split(':')[0] ?? '';
  if (ns && effectivePerms.includes(`${ns}:*`)) return true;

  // property:* covers only the property namespace
  if (effectivePerms.includes('property:*') && ns === 'property') return true;

  return false;
}

// ── resolvePermissions() ──────────────────────────────────────────────────────
// Builds the effective permission set for a decoded token.
export function resolvePermissions(
  role: string,
  grantedPermissions: string[],
  deniedPermissions: string[]
): string[] {
  const roleBase = ROLE_PERMISSIONS[role] ?? [];
  const union = [...new Set([...roleBase, ...grantedPermissions])];
  return union.filter((p) => !deniedPermissions.includes(p));
}

// ── hasPermission() ───────────────────────────────────────────────────────────
// Evaluates a single required permission against an effective set.
export function hasPermission(
  effectivePerms: string[],
  required: string
): boolean {
  return evaluate(effectivePerms, required);
}

// ── hasAnyPermission() ────────────────────────────────────────────────────────
// Mirrors checkPermission.any() — grants access if ANY one of the required
// permissions is satisfied.
export function hasAnyPermission(
  effectivePerms: string[],
  required: string[]
): boolean {
  return required.some((r) => evaluate(effectivePerms, r));
}
