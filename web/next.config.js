/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
    NEXT_PUBLIC_DEFAULT_TENANT: process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'demo',
  },

  // Image optimization
  images: {
    domains: ['localhost', 'team-platform-2025.workers.dev'],
    formats: ['image/avif', 'image/webp'],
  },

  // Output config for Cloudflare Pages
  output: 'standalone',
};

module.exports = nextConfig;
