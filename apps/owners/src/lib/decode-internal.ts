// Thin re-export so the owner app can use decodeToken for the ownerToken
// retention check in useEnterProperty without importing jwt-decode directly.
// This is the only permitted way an app touches decode logic — through
// @stayos/auth, never through jwt-decode directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export { getOwnerToken, setOwnerToken, getActiveToken } from '@stayos/auth';
