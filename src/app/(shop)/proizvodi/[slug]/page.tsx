import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGallery } from '@/components/shop/product-gallery';
import { AddToCart } from '@/components/shop/add-to-cart';
import { getProductBySlug } from '@/lib/shop/catalog';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground" aria-label="Putanja">
        <Link href="/proizvodi" className="hover:text-foreground">
          Proizvodi
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link href={`/kategorije/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <AddToCart product={product} />
          {product.description && (
            <div className="mt-8 border-t pt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Opis
              </h2>
              <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
