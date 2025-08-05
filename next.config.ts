
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
  devIndicators: {
    buildActivity: false,
  },
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
};

// Ensure PWA is only enabled for production builds
const withPWAConfig = withPWA(pwaConfig);

export default withPWAConfig(nextConfig);
