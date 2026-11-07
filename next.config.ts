import type { NextConfig } from 'next';

function supabaseHostname(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
}

const hostname = supabaseHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      ...(hostname && !hostname.endsWith('.supabase.co')
        ? [{ protocol: 'https' as const, hostname, pathname: '/storage/v1/object/public/**' }]
        : []),
    ],
    formats: ['image/webp'],
  },
  experimental: {
    serverActions: {
      // Admin image uploads go through a server action.
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
