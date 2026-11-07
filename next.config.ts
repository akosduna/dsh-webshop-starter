import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Product images, category images and blog covers uploaded to Vercel Blob.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
    formats: ['image/webp'],
  },
  // pg uses Node built-ins; keep it out of the server bundle.
  serverExternalPackages: ['pg'],
};

export default nextConfig;
