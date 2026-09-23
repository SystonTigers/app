/** @type {import('next').NextConfig} */
const path = require('path');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

// The backend Worker. One value feeds every name the pages use for it.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://app-production.team-platform-2025.workers.dev').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,

  // Baked into the browser bundle at build time
  env: {
    NEXT_PUBLIC_API_BASE: API_BASE,
    NEXT_PUBLIC_API_BASE_URL: API_BASE,
    NEXT_PUBLIC_API_URL: API_BASE,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.workers.dev' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // Tell Next to transpile the local SDK package
  transpilePackages: ['@team-platform/sdk'],

  // Monorepo: trace files from the repo root, not just web-app/
  outputFileTracingRoot: path.join(__dirname, '..'),
  turbopack: { root: path.join(__dirname, '..') },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // Some pages call the backend with relative /api/v1 paths; forward them.
  // /api/admin and /api/auth/admin-login are this app's own route handlers
  // and are matched before these rewrites.
  async rewrites() {
    return [
      { source: '/public/:path*', destination: `${API_BASE}/public/:path*` },
      { source: '/api/v1/:path*', destination: `${API_BASE}/api/v1/:path*` },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
