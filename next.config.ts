
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
};

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

export default process.env.NODE_ENV === 'development' ? nextConfig : withPWAConfig(nextConfig);
