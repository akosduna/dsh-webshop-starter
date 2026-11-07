import 'server-only';
import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import type { Tables } from '@/types/database';
import { siteConfig } from '@/config/site';
import { toVariantOptions, type VariantOption } from '@/lib/shop/catalog-utils';

// Public catalog reads. Errors are logged and turned into empty results so a
// misconfigured or unreachable database shows an empty shop instead of a crash
// (this also lets `next build` succeed before Supabase is set up).

export type Category = Pick<
  Tables<'categories'>,
  'id' | 'name' | 'slug' | 'description' | 'image_url' | 'parent_id' | 'sort_order'
>;
export type CategoryWithChildren = Category & { children: Category[] };

export type StoreSettings = Tables<'store_settings'>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  minPriceCents: number;
  maxPriceCents: number;
  inStock: boolean;
  imageUrl: string | null;
  imageAlt: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  options: VariantOption;
  sku: string | null;
  priceCents: number;
  stockQuantity: number;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sku: string | null;
  priceCents: number;
  stockQuantity: number;
  optionNames: string[];
  images: { url: string; alt: string }[];
  variants: ProductVariant[];
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
};

export type ProductSort = 'novo' | 'cijena-asc' | 'cijena-desc' | 'naziv';

export const PRODUCT_SORTS: { value: ProductSort; label: string }[] = [
  { value: 'novo', label: 'Najnovije' },
  { value: 'cijena-asc', label: 'Cijena: niža prema višoj' },
  { value: 'cijena-desc', label: 'Cijena: viša prema nižoj' },
  { value: 'naziv', label: 'Naziv A–Ž' },
];

export function parseSort(value: string | undefined): ProductSort {
  return PRODUCT_SORTS.some((s) => s.value === value) ? (value as ProductSort) : 'novo';
}

function logError(scope: string, error: unknown) {
  console.error(`[catalog] ${scope}:`, error instanceof Error ? error.message : error);
}

function publicClientOrNull() {
  try {
    return createPublicClient();
  } catch (error) {
    logError('client', error);
    return null;
  }
}

const CARD_SELECT =
  'id, slug, name, price_cents, stock_quantity, product_images(url, alt, sort_order), product_variants(price_cents, stock_quantity, is_active)';

type CardRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  product_images: { url: string; alt: string | null; sort_order: number }[];
  product_variants: { price_cents: number | null; stock_quantity: number; is_active: boolean }[];
};

function toCard(row: CardRow): ProductCardData {
  const variants = row.product_variants.filter((v) => v.is_active);
  const prices = variants.length
    ? variants.map((v) => v.price_cents ?? row.price_cents)
    : [row.price_cents];
  const inStock = variants.length
    ? variants.some((v) => v.stock_quantity > 0)
    : row.stock_quantity > 0;
  const image = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    minPriceCents: Math.min(...prices),
    maxPriceCents: Math.max(...prices),
    inStock,
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt ?? row.name,
  };
}

export const getStoreSettings = cache(async (): Promise<StoreSettings | null> => {
  const supabase = publicClientOrNull();
  if (!supabase) return null;
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
  if (error) logError('store_settings', error.message);
  return data ?? null;
});

export async function getShopName(): Promise<string> {
  const settings = await getStoreSettings();
  return settings?.shop_name || siteConfig.defaultShopName;
}

export const getCategoryTree = cache(async (): Promise<CategoryWithChildren[]> => {
  const supabase = publicClientOrNull();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, parent_id, sort_order')
    .order('sort_order')
    .order('name');
  if (error) {
    logError('categories', error.message);
    return [];
  }
  const all = data ?? [];
  return all
    .filter((c) => !c.parent_id)
    .map((parent) => ({ ...parent, children: all.filter((c) => c.parent_id === parent.id) }));
});

export async function getCategoryBySlug(slug: string): Promise<{
  category: Category;
  parent: Category | null;
  children: Category[];
} | null> {
  const tree = await getCategoryTree();
  for (const top of tree) {
    if (top.slug === slug) {
      const { children, ...category } = top;
      return { category, parent: null, children };
    }
    const child = top.children.find((c) => c.slug === slug);
    if (child) {
      const { children, ...parent } = top;
      void children;
      return { category: child, parent, children: [] };
    }
  }
  return null;
}

export type ProductQuery = {
  categoryIds?: string[];
  search?: string;
  sort?: ProductSort;
  minPriceCents?: number;
  maxPriceCents?: number;
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export async function getProducts(query: ProductQuery = {}): Promise<{
  products: ProductCardData[];
  total: number;
}> {
  const supabase = publicClientOrNull();
  if (!supabase) return { products: [], total: 0 };

  const pageSize = query.pageSize ?? siteConfig.pageSize;
  const page = Math.max(1, query.page ?? 1);

  let request = supabase.from('products').select(CARD_SELECT, { count: 'exact' });

  if (query.categoryIds?.length) request = request.in('category_id', query.categoryIds);
  if (query.featuredOnly) request = request.eq('is_featured', true);
  if (query.minPriceCents !== undefined) request = request.gte('price_cents', query.minPriceCents);
  if (query.maxPriceCents !== undefined) request = request.lte('price_cents', query.maxPriceCents);
  if (query.search) {
    const term = query.search.replace(/[%_\\,()]/g, ' ').trim();
    if (term) request = request.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  switch (query.sort ?? 'novo') {
    case 'cijena-asc':
      request = request.order('price_cents', { ascending: true });
      break;
    case 'cijena-desc':
      request = request.order('price_cents', { ascending: false });
      break;
    case 'naziv':
      request = request.order('name', { ascending: true });
      break;
    default:
      request = request.order('sort_order', { ascending: true }).order('created_at', {
        ascending: false,
      });
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await request.range(from, from + pageSize - 1);
  if (error) {
    logError('products', error.message);
    return { products: [], total: 0 };
  }
  return { products: (data ?? []).map(toCard), total: count ?? 0 };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = publicClientOrNull();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, slug, name, description, sku, price_cents, stock_quantity, option_names, categories(id, name, slug), product_images(url, alt, sort_order), product_variants(id, name, options, sku, price_cents, stock_quantity, is_active, sort_order)',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    logError('product', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    sku: data.sku,
    priceCents: data.price_cents,
    stockQuantity: data.stock_quantity,
    optionNames: data.option_names,
    category: data.categories,
    images: [...data.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ url: img.url, alt: img.alt ?? data.name })),
    variants: [...data.product_variants]
      .filter((v) => v.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        name: v.name,
        options: toVariantOptions(v.options),
        sku: v.sku,
        priceCents: v.price_cents ?? data.price_cents,
        stockQuantity: v.stock_quantity,
      })),
  };
}

export async function getActiveShippingMethods() {
  const supabase = publicClientOrNull();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('shipping_methods')
    .select('id, name, description, type, price_cents, free_over_cents')
    .eq('is_active', true)
    .order('sort_order');
  if (error) logError('shipping_methods', error.message);
  return data ?? [];
}
