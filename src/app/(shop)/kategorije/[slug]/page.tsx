import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/shop/product-card';
import { ListingControls, Pagination } from '@/components/shop/listing-controls';
import { getCategoryBySlug, getProducts } from '@/lib/shop/catalog';
import {
  listingHref,
  parseListingParams,
  type ListingSearchParams,
} from '@/lib/shop/listing-params';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getCategoryBySlug(slug);
  return found
    ? { title: found.category.name, description: found.category.description ?? undefined }
    : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const found = await getCategoryBySlug(slug);
  if (!found) notFound();

  const { category, parent, children } = found;
  const listing = parseListingParams(await searchParams);
  const base = `/kategorije/${category.slug}`;
  const { products, total } = await getProducts({
    categoryIds: [category.id, ...children.map((c) => c.id)],
    search: listing.q,
    sort: listing.sort,
    minPriceCents: listing.minPriceCents,
    maxPriceCents: listing.maxPriceCents,
    page: listing.page,
  });
  const siblings = parent ? null : children;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground" aria-label="Putanja">
        <Link href="/proizvodi" className="hover:text-foreground">
          Proizvodi
        </Link>
        {parent && (
          <>
            {' / '}
            <Link href={`/kategorije/${parent.slug}`} className="hover:text-foreground">
              {parent.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-foreground">{category.name}</span>
      </nav>
      <div>
        <h1 className="text-3xl font-semibold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
        )}
      </div>

      {siblings && siblings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className={cn('rounded-full border px-3 py-1 text-sm', 'bg-primary text-primary-foreground')}>
            Sve
          </span>
          {siblings.map((c) => (
            <Link
              key={c.id}
              href={`/kategorije/${c.slug}`}
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <ListingControls
        action={base}
        sort={listing.sort}
        search={listing.q}
        minPrice={listing.min}
        maxPrice={listing.max}
      />
      <ProductGrid products={products} />
      <Pagination
        page={listing.page}
        total={total}
        pageSize={siteConfig.pageSize}
        makeHref={(p) => listingHref(base, listing, p)}
      />
    </div>
  );
}
