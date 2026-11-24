import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  agentRules: false,
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3000/:path*',
      },
    ];
  },
};

export default nextConfig;
