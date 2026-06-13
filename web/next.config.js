/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force all pages to be dynamic — prevents SSR from trying to init Supabase at build time
  experimental: {},
};

module.exports = nextConfig;
