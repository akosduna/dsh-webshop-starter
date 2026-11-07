import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ProductImage } from '@/components/ui/product-image';
import { getPublishedPosts } from '@/lib/blog/posts';
import { siteUrl } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { getShopName } from '@/lib/shop/catalog';

export async function generateMetadata(): Promise<Metadata> {
  const shopName = await getShopName();
  return {
    title: 'Blog',
    description: `Savjeti, novosti i priče iz trgovine ${shopName}.`,
    alternates: { canonical: `${siteUrl()}/blog` },
  };
}

function formatDay(date: Date | null) {
  return date ? new Intl.DateTimeFormat('hr-HR', { dateStyle: 'long' }).format(date) : '';
}

export default async function BlogPage() {
  if (!isModuleReady('blog')) notFound();
  const posts = await getPublishedPosts();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Blog</h1>
      {posts.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">Još nema objava.</Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <Card className="h-full overflow-hidden p-0 transition-shadow group-hover:shadow-md">
                <div className="relative aspect-[16/9] bg-muted">
                  <ProductImage src={post.cover_image_url} alt={post.title} sizes="(min-width: 1024px) 33vw, 100vw" />
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-xs text-muted-foreground">{formatDay(post.published_at)}</p>
                  <h2 className="text-lg font-semibold group-hover:text-primary">{post.title}</h2>
                  {post.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
