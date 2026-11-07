import type { Metadata } from 'next';
import { ProductGrid } from '@/components/shop/product-card';
import { ListingControls, Pagination } from '@/components/shop/listing-controls';
import { getProducts } from '@/lib/shop/catalog';
import {
  listingHref,
  parseListingParams,
  type ListingSearchParams,
} from '@/lib/shop/listing-params';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Svi proizvodi' };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = parseListingParams(await searchParams);
  const { products, total } = await getProducts({
    search: params.q,
    sort: params.sort,
    minPriceCents: params.minPriceCents,
    maxPriceCents: params.maxPriceCents,
    page: params.page,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          {params.q ? `Rezultati za „${params.q}”` : 'Svi proizvodi'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} proizvoda</p>
      </div>
      <ListingControls
        action="/proizvodi"
        sort={params.sort}
        search={params.q}
        minPrice={params.min}
        maxPrice={params.max}
      />
      <ProductGrid products={products} />
      <Pagination
        page={params.page}
        total={total}
        pageSize={siteConfig.pageSize}
        makeHref={(p) => listingHref('/proizvodi', params, p)}
      />
    </div>
  );
}
