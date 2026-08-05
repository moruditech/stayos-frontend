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
};

module.exports = nextConfig;
