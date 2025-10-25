/** @type {import('next').NextConfig} */
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

module.exports = nextConfig;
