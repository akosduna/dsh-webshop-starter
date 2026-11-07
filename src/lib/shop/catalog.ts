import 'server-only';
import { cache } from 'react';
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  categories,
  products,
  shippingMethods,
  storeSettings,
  type StoreSettings as StoreSettingsRow,
} from '@/db/schema';
import { safeQuery } from '@/db/utils';
import { siteConfig } from '@/config/site';
import { toVariantOptions, type VariantOption } from '@/lib/shop/catalog-utils';
import type { ShippingMethod } from '@/lib/shop/shipping';

// Public catalog reads. Only active rows are returned (the admin reads its own
// data). Before the migrations have run every read returns an empty result, so
// a fresh deploy shows an empty shop instead of crashing.

export type Category = Pick<
  typeof categories.$inferSelect,
  'id' | 'name' | 'slug' | 'description' | 'image_url' | 'parent_id' | 'sort_order'
>;
export type CategoryWithChildren = Category & { children: Category[] };

export type StoreSettings = StoreSettingsRow;

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

type CardRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  images: { url: string; alt: string | null; sort_order: number }[];
  variants: { price_cents: number | null; stock_quantity: number; is_active: boolean }[];
};

function toCard(row: CardRow): ProductCardData {
  const variants = row.variants.filter((v) => v.is_active);
  const prices = variants.length
    ? variants.map((v) => v.price_cents ?? row.price_cents)
    : [row.price_cents];
  const inStock = variants.length
    ? variants.some((v) => v.stock_quantity > 0)
    : row.stock_quantity > 0;
  const image = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
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

export const getStoreSettings = cache(
  async (): Promise<StoreSettings | null> =>
    safeQuery(
      'store_settings',
      async () => {
        const rows = await getDb().select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
        return rows[0] ?? null;
      },
      null,
    ),
);

export async function getShopName(): Promise<string> {
  const settings = await getStoreSettings();
  return settings?.shop_name || siteConfig.defaultShopName;
}

export const getCategoryTree = cache(
  async (): Promise<CategoryWithChildren[]> =>
    safeQuery(
      'categories',
      async () => {
        const all = await getDb()
          .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            image_url: categories.image_url,
            parent_id: categories.parent_id,
            sort_order: categories.sort_order,
          })
          .from(categories)
          .where(eq(categories.is_active, true))
          .orderBy(asc(categories.sort_order), asc(categories.name));
        return all
          .filter((c) => !c.parent_id)
          .map((parent) => ({ ...parent, children: all.filter((c) => c.parent_id === parent.id) }));
      },
      [],
    ),
);

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

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function getProducts(query: ProductQuery = {}): Promise<{
  products: ProductCardData[];
  total: number;
}> {
  const pageSize = query.pageSize ?? siteConfig.pageSize;
  const page = Math.max(1, query.page ?? 1);

  const filters: SQL[] = [eq(products.is_active, true)];
  if (query.categoryIds?.length) filters.push(inArray(products.category_id, query.categoryIds));
  if (query.featuredOnly) filters.push(eq(products.is_featured, true));
  if (query.minPriceCents !== undefined) filters.push(gte(products.price_cents, query.minPriceCents));
  if (query.maxPriceCents !== undefined) filters.push(lte(products.price_cents, query.maxPriceCents));
  const term = query.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    filters.push(or(ilike(products.name, pattern), ilike(products.description, pattern))!);
  }
  const where = and(...filters);

  const orderBy = (() => {
    switch (query.sort ?? 'novo') {
      case 'cijena-asc':
        return [asc(products.price_cents), asc(products.name)];
      case 'cijena-desc':
        return [desc(products.price_cents), asc(products.name)];
      case 'naziv':
        return [asc(products.name)];
      default:
        return [asc(products.sort_order), desc(products.created_at)];
    }
  })();

  return safeQuery(
    'products',
    async () => {
      const db = getDb();
      const [rows, [{ value: total }]] = await Promise.all([
        db.query.products.findMany({
          where,
          orderBy,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          columns: { id: true, slug: true, name: true, price_cents: true, stock_quantity: true },
          with: {
            images: { columns: { url: true, alt: true, sort_order: true } },
            variants: { columns: { price_cents: true, stock_quantity: true, is_active: true } },
          },
        }),
        db.select({ value: count() }).from(products).where(where),
      ]);
      return { products: rows.map(toCard), total };
    },
    { products: [], total: 0 },
  );
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return safeQuery(
    'product',
    async () => {
      const data = await getDb().query.products.findFirst({
        where: and(eq(products.slug, slug), eq(products.is_active, true)),
        with: {
          category: { columns: { id: true, name: true, slug: true } },
          images: { columns: { url: true, alt: true, sort_order: true } },
          variants: true,
        },
      });
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
        category: data.category,
        images: [...data.images]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => ({ url: img.url, alt: img.alt ?? data.name })),
        variants: [...data.variants]
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
    },
    null,
  );
}

/** Active methods from the database (not yet filtered by module readiness). */
export async function getActiveShippingMethods(): Promise<ShippingMethod[]> {
  return safeQuery(
    'shipping_methods',
    () =>
      getDb()
        .select({
          id: shippingMethods.id,
          name: shippingMethods.name,
          description: shippingMethods.description,
          type: shippingMethods.type,
          price_cents: shippingMethods.price_cents,
          free_over_cents: shippingMethods.free_over_cents,
          max_subtotal_cents: shippingMethods.max_subtotal_cents,
          countries: shippingMethods.countries,
        })
        .from(shippingMethods)
        .where(eq(shippingMethods.is_active, true))
        .orderBy(asc(shippingMethods.sort_order), asc(shippingMethods.name)),
    [],
  );
}
