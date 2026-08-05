import { NextRequest, NextResponse } from 'next/server';

const AUTH_PATHS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/api'];
const MARKER_COOKIE = 'stayos-session-marker';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

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
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
