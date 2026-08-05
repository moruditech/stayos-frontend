// Public surface of @stayos/auth.
// decode.ts and token-store.ts are internal — not exported here.
// Nothing above this package imports jwt-decode or reads a token value directly.

export {
  SessionProvider,
  useSession,
  useSessionLoading,
  useSessionContext,
} from './SessionProvider';

export { performLogout } from './logout';

export {
  resolvePermissions,
  hasPermission,
  hasAnyPermission,
  ROLE_PERMISSIONS,
} from './permissions';

export { getAgencyContext, isAgencyStaffInProperty } from './agency-context';

// Token store exports — used by api-client wiring inside SessionProvider
// and by property-entry hooks. Not for general app use.
export {
  getActiveToken,
  getOwnerToken,
  setActiveToken,
  setOwnerToken,
  clearAllTokens,
} from './token-store';

export { writeMarkerCookie, clearMarkerCookie } from './marker-cookie';
