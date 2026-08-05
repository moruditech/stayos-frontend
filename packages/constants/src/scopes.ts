// Scope type is defined in @stayos/types (the bottom-most package) and
// re-exported here so app code imports from @stayos/constants as documented.
export type { Scope } from '@stayos/types';

export const SCOPES = {
  PLATFORM: 'platform',
  AGENCY: 'agency',
  TENANT: 'tenant',
  CUSTOMER: 'customer',
  OWNER: 'owner',
} as const;
