
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
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
};

// Ensure PWA is only enabled for production builds
const withPWAConfig = withPWA(pwaConfig);

// The line below is the original setting to only enable PWA in production.
// export default process.env.NODE_ENV === 'development' ? nextConfig : withPWAConfig(nextConfig);

// This line enables PWA in all environments, including development.
export default withPWAConfig(nextConfig);
