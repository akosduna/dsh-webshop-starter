import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { getCategoryTree, getProducts } from '@/lib/shop/catalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [categories, { products }] = await Promise.all([
    getCategoryTree(),
    getProducts({ pageSize: 1000 }),
  ]);
  const staticPaths = ['', '/proizvodi', '/kontakt', '/uvjeti-kupnje', '/privatnost', '/kolacici'];

  return [
    ...staticPaths.map((path) => ({ url: `${base}${path}` })),
    ...categories.flatMap((c) => [c, ...c.children]).map((c) => ({ url: `${base}/kategorije/${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/proizvodi/${p.slug}` })),
  ];
}
