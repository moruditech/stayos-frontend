import { AGENCY_ROLES, PROPERTY_ROLES } from './roles';
import type { AgencyRole, PropertyRole } from './roles';

// Mirrors AGENCY_TO_PROPERTY_ROLE in the backend's mandate.service.js —
// the role an agency staff member's token is translated into on entering
// a managed property (POST /agency/properties/:propertyId/enter). This is
// static data, not logic — packages/auth consumes it, it doesn't live
// there (Document 08 §4).
export const AGENCY_TO_PROPERTY_ROLE: Record<AgencyRole, PropertyRole> = {
  [AGENCY_ROLES.AGENCY_OWNER]: PROPERTY_ROLES.PROPERTY_OWNER,
  [AGENCY_ROLES.AGENCY_MANAGER]: PROPERTY_ROLES.PROPERTY_ADMIN,
  [AGENCY_ROLES.AGENCY_SUPERVISOR]: PROPERTY_ROLES.PROPERTY_MANAGER,
  [AGENCY_ROLES.AGENCY_RESERVATIONS]: PROPERTY_ROLES.RECEPTIONIST,
  [AGENCY_ROLES.AGENCY_HOUSEKEEPER]: PROPERTY_ROLES.HOUSEKEEPER,
  [AGENCY_ROLES.AGENCY_MAINTENANCE]: PROPERTY_ROLES.MAINTENANCE_TECHNICIAN,
} as const;

// Agency roles that bypass per-property assignment and get automatic
// access to every property under an active/termination_notice mandate.
// Affects the Agency Portal's own property list only (Document 08 §4) —
// it does not change anything about mapped-role behavior once inside a
// property.
export const UNRESTRICTED_AGENCY_ROLES: AgencyRole[] = [
  AGENCY_ROLES.AGENCY_OWNER,
  AGENCY_ROLES.AGENCY_MANAGER,
];
