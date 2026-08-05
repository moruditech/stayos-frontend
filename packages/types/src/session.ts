// Scope and AccessMode are defined here (in types, the bottom-most package)
// and re-exported by @stayos/constants. This preserves the TAD 00 §9.2
// dependency direction: types → (nothing internal), constants → types.

export type Scope = 'platform' | 'agency' | 'tenant' | 'customer' | 'owner';
export type AccessMode = 'operational' | 'read_only';

/**
 * Decoded access token payload.
 *
 * The token carries the RAW ingredients for permission evaluation, not a
 * pre-resolved permission set — verified directly against
 * auth.helpers.js#buildJwtPayload on the backend. grantedPermissions and
 * deniedPermissions are per-user overrides on top of the role's base set.
 * The effective set is (ROLE_PERMISSIONS[role] ∪ granted) − denied,
 * computed client-side by @stayos/auth (permissions.ts), mirroring
 * checkPermission.js#_evaluate() exactly. No backend endpoint returns an
 * already-resolved array.
 */
export interface DecodedAccessToken {
  userId: string;
  scope: Scope;
  role: string;
  tenantId: string | null;
  agencyId: string | null;
  mandateId: string | null;
  accessMode: AccessMode | null;
  grantedPermissions: string[];
  deniedPermissions: string[];
  iat: number;
  exp: number;
}

/**
 * Shape returned from GET /properties/me (session bootstrap call).
 *
 * CORRECTED SHAPE: verified against tenants.controller.js#getMe /
 * tenants.service.js#getProfile. The response is the Tenant document FLAT —
 * planId and agencyId are populated sub-fields on it, not nested under a
 * `tenant` key. A type wrapping this in { tenant: {...} } reads undefined
 * for every field at runtime.
 */
export interface PropertySessionBootstrap {
  _id: string;
  name: string;
  type: string;
  status: string;
  activeMandateId: string | null;
  ownerReadOnlyAccess: boolean;
  bankAccount?: {
    accountNumber: string; // literal '****' as sent — never unmask client-side
    bankName: string;
  };
  planId: {
    name: string;
    tier: string;
    monthlyPrice: number;
    features: string[];
    // NOTE: can diverge from checkPlanFeature enforcement under active mandate.
    // See plan-features.ts in @stayos/constants.
  };
  agencyId: {
    name: string;
    slug: string;
  } | null;
}

export interface Session {
  userId: string;
  scope: Scope;
  role: string;
  tenantId: string | null;
  agencyId: string | null;
  mandateId: string | null;
  accessMode: AccessMode | null;
  isAgencyStaffInProperty: boolean; // display-only — never a gating input
  permissions: string[]; // resolved client-side, mirrors checkPermission._evaluate()
  features: string[]; // from planId.features via GET /properties/me
  activeToken: string;
}
