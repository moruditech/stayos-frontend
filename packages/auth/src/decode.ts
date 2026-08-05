import { jwtDecode } from 'jwt-decode';
import type { DecodedAccessToken } from '@stayos/types';

// Decodes without verifying — signature verification is backend-only.
// This is internal to @stayos/auth; the raw decoded token is never
// exposed outside this package. Only useSession()'s resolved Session
// shape is the public surface.
export function decodeToken(token: string | null): DecodedAccessToken | null {
  if (!token) return null;
  try {
    return jwtDecode<DecodedAccessToken>(token);
  } catch {
    return null;
  }
}

// bufferSeconds — how many seconds before actual expiry we treat the token
// as expired. 120s (2 min) matches the backend's own refresh-ahead convention.
export function isTokenExpired(
  token: string | null,
  bufferSeconds = 120
): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp < Math.floor(Date.now() / 1000) + bufferSeconds;
}

export function getAccessMode(
  token: string | null
): DecodedAccessToken['accessMode'] {
  return decodeToken(token)?.accessMode ?? null;
}
