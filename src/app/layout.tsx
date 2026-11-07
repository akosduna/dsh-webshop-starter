import type { Metadata } from 'next';
import { getShopName, getStoreSettings } from '@/lib/shop/catalog';
import { siteUrl } from '@/lib/env';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const [shopName, settings] = await Promise.all([getShopName(), getStoreSettings()]);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: shopName, template: `%s | ${shopName}` },
    description: settings?.tagline ?? undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
