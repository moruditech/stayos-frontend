/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@stayos/ui',
    '@stayos/auth',
    '@stayos/api-client',
    '@stayos/constants',
    '@stayos/types',
    '@stayos/validators',
  ],

  // ── API proxy rewrites ─────────────────────────────────────────────────────
  // ALL /api/v1/* requests are proxied through the Next.js server to the
  // backend. This is the canonical fix for the cross-site refresh-cookie
  // problem:
  //
  //   Problem: the backend sets the HttpOnly refreshToken cookie with
  //   sameSite: 'strict'. When the frontend (e.g. stayos-customer.netlify.app)
  //   makes a fetch to the backend (e.g. stayos-api.onrender.com), the browser
  //   treats it as a cross-site request — netlify.app and onrender.com are
  //   both on the public suffix list, so their subdomains are different sites.
  //   sameSite: 'strict' blocks the cookie on every cross-site XHR/fetch,
  //   including POST /auth/refresh. Result: every page reload and every
  //   invalid-path navigation logs the user out, because the bootstrap
  //   refresh always fails.
  //
  //   Fix: the browser only ever calls MY OWN DOMAIN (/api/v1/*). Next.js
  //   forwards the request server-side to API_URL. The Set-Cookie header
  //   flows back through Next.js, so the browser stores the cookie for
  //   this domain. Subsequent refresh calls go to the same origin — no
  //   cross-site check, cookie always sent.
  //
  // Deployment: set API_URL (server-side env var, NOT NEXT_PUBLIC_) in
  // Netlify/Render to the backend origin, e.g.:
  //   API_URL=https://stayos-api.onrender.com
  //
  // Also unset (or clear) NEXT_PUBLIC_API_URL for this portal — the client
  // must use relative paths so requests go through this proxy, not directly
  // to the backend. See packages/api-client/src/client.ts BASE_URL.
  async rewrites() {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:5000';
    return [
      {
        source:      '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
