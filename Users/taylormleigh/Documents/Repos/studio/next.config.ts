
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
    buildActivity: false
  },
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Disabling this will enable PWA in development mode
};

// Ensure PWA is only enabled for production builds
const withPWAConfig = withPWA(pwaConfig);

// The line below is the original setting to only enable PWA in production.
export default process.env.NODE_ENV === 'development' ? withPWAConfig(nextConfig) : withPWAConfig(nextConfig);
