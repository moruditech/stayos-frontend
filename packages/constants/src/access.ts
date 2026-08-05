// AccessMode and MandateStatus types are defined in @stayos/types and
// re-exported here so app code imports from @stayos/constants as documented.
export type { AccessMode } from '@stayos/types';
export type { MandateStatus } from '@stayos/types';

export const ACCESS_MODE = {
  OPERATIONAL: 'operational',
  READ_ONLY: 'read_only',
} as const;

export const MANDATE_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  TERMINATION_NOTICE: 'termination_notice',
  TERMINATED: 'terminated',
} as const;

// NOTE: Tenant.ownerReadOnlyAccess is verified dead code — not consulted
// by enterProperty() server-side. Backend ticket filed; frontend consumes
// whatever accessMode the token carries.
