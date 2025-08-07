
import type {NextConfig} from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: false,
  experimental: {
    // This is required to allow requests from the studio UI
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
    ]
  },
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
};

// Only apply PWA plugin in production
if (process.env.NODE_ENV === 'production') {
  module.exports = withPWA(pwaConfig)(nextConfig);
} else {
  module.exports = nextConfig;
}
