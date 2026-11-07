import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getCategoryTree, getShopName, getStoreSettings } from '@/lib/shop/catalog';

// Public pages are cached and refreshed at most every 60 s (admin changes
// also refresh them immediately via revalidatePath).
export const revalidate = 60;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [shopName, settings, categories] = await Promise.all([
    getShopName(),
    getStoreSettings(),
    getCategoryTree(),
  ]);

  return (
    <>
      <Header shopName={shopName} categories={categories} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <Footer shopName={shopName} settings={settings} />
    </>
  );
}
