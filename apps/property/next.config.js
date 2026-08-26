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

  // Proxy /api/v1/* to the backend so the browser never makes a cross-origin
  // request. This keeps the HttpOnly refresh cookie on the same effective
  // origin and avoids the sameSite:strict cross-site cookie block.
  // API_URL is a server-side-only env var set in Netlify — never exposed
  // to the client bundle. NEXT_PUBLIC_API_URL must NOT be set on Netlify.
  async rewrites() {
    const backendUrl =
      process.env['API_URL'] ?? 'https://stayos-api.onrender.com';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
