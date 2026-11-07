import Link from 'next/link';
import { ProductImage } from '@/components/ui/product-image';
import { Badge } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import type { ProductCardData } from '@/lib/shop/catalog';

export function ProductCard({ product, eager = false }: { product: ProductCardData; eager?: boolean }) {
  const fromPrice = product.minPriceCents !== product.maxPriceCents;
  return (
    <Link href={`/proizvodi/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt}
          eager={eager}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {!product.inStock && (
          <Badge tone="neutral" className="absolute left-2 top-2 bg-card">
            Rasprodano
          </Badge>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium group-hover:text-primary">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {fromPrice ? 'od ' : ''}
          {formatPrice(product.minPriceCents)}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        Nema proizvoda za prikaz.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < 4} />
      ))}
    </div>
  );
}
