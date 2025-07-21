/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@field-tracker/api-client', '@field-tracker/shared-utils'],
  experimental: {
    appDir: true,
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;