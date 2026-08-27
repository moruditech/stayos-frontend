// In-memory only — never localStorage or sessionStorage.
// The single documented exception (white-label custom-domain Owner Portal)
// is handled by SessionProvider using sessionStorage when an env variable
// signals custom-domain mode. That is not a pattern to reach for elsewhere.
//
// Two slots:
//   activeToken — the token attached to every API request. Set on login
//     for all scopes; for owner sessions it starts as the owner token,
//     then is replaced by a tenant-scoped token after entering a property.
//   ownerToken  — owner-scoped JWT retained across property entry/exit so
//     the owner can return to the property picker without re-authenticating.
//     Never read by the api-client; it exists for the multi-token context
//     described in Document 02 §3.

let activeToken: string | null = null;
let ownerToken: string | null = null;

// ── Refresh token (localStorage) ───────────────────────────────────────────
// Opt-in, used only by portals that can't rely on the HttpOnly cross-site
// cookie surviving third-party-cookie blocking (e.g. the admin portal — a
// static SPA on a different domain than the API, with no server-side proxy
// available to make the cookie first-party). Cookie-based portals
// (customer, property) never call these and are unaffected.
//
// Trade-off, spelled out: unlike the HttpOnly cookie, this is readable by
// any JS on the page, so an XSS bug here can lift the refresh token
// directly. Kept only for portals where the alternative (staying logged
// out) was worse for the deployment as it stands; the durable fix is still
// putting the frontend and API on the same registrable domain so the
// cookie can be first-party (see auth.controller.js COOKIE_DOMAIN).
const REFRESH_TOKEN_KEY = 'stayos_refresh_token';

export function getStoredRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null; // storage unavailable (privacy mode, SSR, etc.)
  }
}

export function setStoredRefreshToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // storage unavailable — silently no-op, same as read
  }
}

export function getActiveToken(): string | null {
  return activeToken;
}

export function setActiveToken(token: string | null): void {
  activeToken = token;
}

export function getOwnerToken(): string | null {
  return ownerToken;
}

export function setOwnerToken(token: string | null): void {
  ownerToken = token;
}

export function clearAllTokens(): void {
  activeToken = null;
  ownerToken = null;
  setStoredRefreshToken(null);
}
