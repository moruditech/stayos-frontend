import { NextRequest, NextResponse } from 'next/server';

// Public portal is entirely anonymous — no auth gate.
// The only middleware job here is ensuring authenticated users from other
// portals hitting this domain don't see a broken state. There is nothing
// to redirect; the portal itself handles the handoff to my.stayos.co.za
// on the "Book now" CTA (Document 09 §4).
export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}
