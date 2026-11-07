import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductImage } from '@/components/ui/product-image';
import { getPublishedPostBySlug } from '@/lib/blog/posts';
import { siteUrl } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { getShopName } from '@/lib/shop/catalog';

type Props = { params: Promise<{ slug: string }> };

function absolute(url: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${siteUrl()}${url}` : url;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isModuleReady('blog')) return {};
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: 'Objava nije pronađena', robots: { index: false } };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || undefined;
  const url = `${siteUrl()}/blog/${post.slug}`;
  const image = absolute(post.cover_image_url);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      publishedTime: post.published_at?.toISOString(),
      modifiedTime: post.updated_at.toISOString(),
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  if (!isModuleReady('blog')) notFound();
  const { slug } = await params;
  const [post, shopName] = await Promise.all([getPublishedPostBySlug(slug), getShopName()]);
  if (!post) notFound();

  const url = `${siteUrl()}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt || undefined,
    image: absolute(post.cover_image_url),
    datePublished: post.published_at?.toISOString(),
    dateModified: post.updated_at.toISOString(),
    mainEntityOfPage: url,
    publisher: { '@type': 'Organization', name: shopName },
  };

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Link href="/blog" className="text-sm text-primary hover:underline">
        ← Blog
      </Link>
      <header className="space-y-3">
        {post.published_at && (
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat('hr-HR', { dateStyle: 'long' }).format(post.published_at)}
          </p>
        )}
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{post.title}</h1>
        {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
      </header>
      {post.cover_image_url && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
          <ProductImage src={post.cover_image_url} alt={post.title} sizes="(min-width: 768px) 768px, 100vw" eager />
        </div>
      )}
      {/* content is sanitised on save (src/lib/blog/sanitize.ts) */}
      <div className="prose-article" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
