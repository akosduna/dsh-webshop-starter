import { parsePriceToCents } from '@/lib/utils';
import { parseSort, type ProductSort } from '@/lib/shop/catalog';

export type ListingSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads ?q=&sort=&min=&max=&page= from the URL. */
export function parseListingParams(params: ListingSearchParams) {
  const q = first(params.q)?.trim() || undefined;
  const sort: ProductSort = parseSort(first(params.sort));
  const min = first(params.min)?.trim() || undefined;
  const max = first(params.max)?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1);
  return {
    q,
    sort,
    min,
    max,
    page,
    minPriceCents: min ? (parsePriceToCents(min) ?? undefined) : undefined,
    maxPriceCents: max ? (parsePriceToCents(max) ?? undefined) : undefined,
  };
}

export function listingHref(
  base: string,
  params: { q?: string; sort?: string; min?: string; max?: string },
  page: number,
): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.sort && params.sort !== 'novo') search.set('sort', params.sort);
  if (params.min) search.set('min', params.min);
  if (params.max) search.set('max', params.max);
  if (page > 1) search.set('page', String(page));
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}
