// The marker cookie is a plain (non-HttpOnly) cookie written client-side by
// SessionProvider once a valid access token is confirmed in memory. It
// carries no secret — it exists solely so Next.js middleware.ts can make a
// routing decision before any client JS runs. The actual access token never
// leaves JavaScript memory.
//
// The middleware decodes this marker without verifying (verification already
// happened server-side when the token was issued) and uses it only to decide
// whether to redirect to /login. See each portal's middleware.ts.

const MARKER_COOKIE = 'stayos-session-marker';
// Short-lived — just long enough to survive a page navigation. The in-memory
// access token (15-minute JWT) is the true authority; this just avoids a
// FOUC where the portal briefly renders the auth layout before redirecting.
const MARKER_MAX_AGE_SECONDS = 60 * 20; // 20 minutes, always < token TTL

export function writeMarkerCookie(scope: string): void {
  if (typeof document === 'undefined') return; // SSR guard
  document.cookie = [
    `${MARKER_COOKIE}=${scope}`,
    `Max-Age=${MARKER_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Strict',
    ...(location.protocol === 'https:' ? ['Secure'] : []),
  ].join('; ');
}

export function clearMarkerCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${MARKER_COOKIE}=; Max-Age=0; Path=/; SameSite=Strict`;
}
