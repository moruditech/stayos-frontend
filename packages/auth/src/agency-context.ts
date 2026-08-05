import { decodeToken } from './decode';

// Both functions below are display-only — they drive the "Back to Agency
// Dashboard" link and identity badge in the Property Operations Portal
// header. They are never read by RoleGate, PlanGate, or the nav filter.
// Gating always uses session.permissions (the mapped property-level role's
// resolved set), exactly like a native staff session. This is a standing
// instruction for this project.

export function getAgencyContext(
  token: string | null
): { agencyId: string; mandateId: string } | null {
  const decoded = decodeToken(token);
  if (!decoded?.agencyId || !decoded?.mandateId) return null;
  return { agencyId: decoded.agencyId, mandateId: decoded.mandateId };
}

export function isAgencyStaffInProperty(token: string | null): boolean {
  const decoded = decodeToken(token);
  return !!(decoded?.agencyId && decoded?.tenantId);
}
