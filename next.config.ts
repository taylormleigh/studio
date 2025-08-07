
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
  devIndicators: false
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
