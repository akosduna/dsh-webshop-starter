import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blog/posts';
import { siteUrl } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { getCategoryTree, getProducts } from '@/lib/shop/catalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const blog = isModuleReady('blog');
  const [categories, { products }, posts] = await Promise.all([
    getCategoryTree(),
    getProducts({ pageSize: 1000 }),
    blog ? getPublishedPosts(1000) : Promise.resolve([]),
  ]);
  const staticPaths = [
    '',
    '/proizvodi',
    ...(blog ? ['/blog'] : []),
    '/kontakt',
    '/uvjeti-kupnje',
    '/privatnost',
    '/kolacici',
  ];

  return [
    ...staticPaths.map((path) => ({ url: `${base}${path}` })),
    ...categories.flatMap((c) => [c, ...c.children]).map((c) => ({ url: `${base}/kategorije/${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/proizvodi/${p.slug}` })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updated_at })),
  ];
}
