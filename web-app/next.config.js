/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
    NEXT_PUBLIC_DEFAULT_TENANT: process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'demo',
  },

  // Image optimization
  images: {
    domains: ['localhost', 'team-platform-2025.workers.dev'],
    formats: ['image/avif', 'image/webp'],
  },

  // Tell Next to transpile the local SDK package
  transpilePackages: ['@team-platform/sdk'],

  // Output config for Cloudflare Pages
  output: 'standalone',

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
          // Add CSP later once routes are stable
        ]
      }
    ];
  },



  // API rewrites to proxy to backend
  async rewrites() {
    return [
      {
        source: '/public/:path*',
        destination: 'http://127.0.0.1:3001/public/:path*'
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*'
      }
    ];
  },

  // Turbopack config
  turbopack: {},

  // Webpack config for Axios browser/node compatibility
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['axios'] = isServer
      ? require.resolve('axios')
      : require.resolve('axios/dist/browser/axios.cjs');
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
