import { NextRequest, NextResponse } from 'next/server';

// Routes that are always accessible — login page and any public assets.
const AUTH_PATHS = ['/login'];
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/api'];

// The marker cookie is a plain (non-HttpOnly) cookie that SessionProvider
// writes client-side once a valid access token is confirmed in memory.
// It carries no secret — it exists solely so middleware has something to
// check before any client JS runs. The actual token lives in memory only.
// Verification happened server-side when the token was issued; middleware
// is making a routing decision, not a security one.
const MARKER_COOKIE = 'stayos-session-marker';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Always allow auth group and static assets
  if (
    AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const marker = request.cookies.get(MARKER_COOKIE);

  if (!marker?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Marker present — scope validation (e.g. wrong portal) would happen here
  // once a scope claim is included in the marker. For now, presence is
  // sufficient for the route-protection decision; scope enforcement is the
  // backend's responsibility via checkScope.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
