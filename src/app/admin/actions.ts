'use server';

import { and, asc, desc, eq, notInArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { categories, productImages, products, productVariants, shippingMethods, storeSettings } from '@/db/schema';
import { SHIPPING_METHOD_TYPES, type ShippingMethodType } from '@/db/enums';
import { isUniqueViolation } from '@/db/utils';
import { requireAdmin } from '@/lib/auth/server';
import { deleteBlobs, isAllowedImageUrl } from '@/lib/blob';
import { parsePriceToCents, slugify } from '@/lib/utils';

export type ActionState = { error?: string; success?: string } | null;

function text(formData: FormData, key: string, max = 500): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function int(formData: FormData, key: string, fallback = 0): number {
  const n = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Optional price field: '' → null, invalid → undefined. */
function optionalCents(formData: FormData, key: string): number | null | undefined {
  const raw = text(formData, key, 20);
  if (!raw) return null;
  return parsePriceToCents(raw) ?? undefined;
}

/** Refresh every cached storefront page after catalog/settings changes. */
function refreshShop() {
  revalidatePath('/', 'layout');
}

function friendlyDbError(error: unknown): string {
  if (isUniqueViolation(error, 'slug')) return 'Taj URL (slug) već postoji. Odaberite drugi.';
  console.error('[admin]', error);
  return 'Spremanje nije uspjelo.';
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type VariantInput = {
  id?: string;
  options: Record<string, string>;
  sku: string;
  price: string;
  stock: string;
  is_active: boolean;
};

function parseVariants(raw: string): VariantInput[] | null {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return null;
    return parsed.map((v) => {
      const row = v as Partial<VariantInput>;
      return {
        id: typeof row.id === 'string' && row.id ? row.id : undefined,
        options: row.options && typeof row.options === 'object' ? row.options : {},
        sku: String(row.sku ?? ''),
        price: String(row.price ?? ''),
        stock: String(row.stock ?? '0'),
        is_active: row.is_active !== false,
      };
    });
  } catch {
    return null;
  }
}

export async function saveProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const name = text(formData, 'name', 200);
  const slug = slugify(text(formData, 'slug', 200) || name);
  const priceCents = parsePriceToCents(text(formData, 'price', 20));
  const optionNames = text(formData, 'option_names')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const variants = parseVariants(text(formData, 'variants', 50000));

  if (!name) return { error: 'Upišite naziv proizvoda.' };
  if (!slug) return { error: 'URL (slug) nije ispravan.' };
  if (priceCents === null) return { error: 'Cijena nije ispravna (npr. 19,90).' };
  if (!variants) return { error: 'Varijante nisu ispravne.' };

  const variantRows: (Omit<typeof productVariants.$inferInsert, 'product_id'> & { id?: string })[] = [];
  for (const [index, v] of variants.entries()) {
    const values = optionNames.map((n) => (v.options[n] ?? '').trim());
    if (optionNames.length === 0 || values.some((x) => !x)) {
      return {
        error: `Varijanta ${index + 1}: ispunite sve opcije (${optionNames.join(', ') || 'najprije upišite nazive opcija'}).`,
      };
    }
    const variantPrice = v.price.trim() ? parsePriceToCents(v.price) : null;
    if (v.price.trim() && variantPrice === null) {
      return { error: `Varijanta ${index + 1}: cijena nije ispravna.` };
    }
    const stock = Number.parseInt(v.stock, 10);
    variantRows.push({
      id: v.id,
      name: values.join(' / '),
      options: Object.fromEntries(optionNames.map((n, i) => [n, values[i]])),
      sku: v.sku.trim() || null,
      price_cents: variantPrice,
      stock_quantity: Number.isFinite(stock) && stock > 0 ? stock : 0,
      is_active: v.is_active,
      sort_order: index,
    });
  }

  const categoryId = text(formData, 'category_id');
  const product = {
    name,
    slug,
    description: text(formData, 'description', 10000) || null,
    price_cents: priceCents,
    sku: text(formData, 'sku', 100) || null,
    stock_quantity: Math.max(0, int(formData, 'stock_quantity')),
    category_id: categoryId || null,
    option_names: variantRows.length ? optionNames : [],
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    sort_order: int(formData, 'sort_order'),
  };

  let productId = id;
  try {
    productId = await getDb().transaction(async (tx) => {
      let pid = id;
      if (id) {
        const updated = await tx.update(products).set(product).where(eq(products.id, id)).returning({ id: products.id });
        if (updated.length === 0) throw new Error('Proizvod ne postoji.');
      } else {
        const [created] = await tx.insert(products).values(product).returning({ id: products.id });
        pid = created.id;
      }

      // Sync variants: delete removed ones, update existing, insert new.
      const keepIds = variantRows.map((v) => v.id).filter((v): v is string => !!v);
      await tx
        .delete(productVariants)
        .where(
          keepIds.length
            ? and(eq(productVariants.product_id, pid), notInArray(productVariants.id, keepIds))
            : eq(productVariants.product_id, pid),
        );
      for (const { id: variantId, ...row } of variantRows) {
        if (variantId) {
          await tx
            .update(productVariants)
            .set(row)
            .where(and(eq(productVariants.id, variantId), eq(productVariants.product_id, pid)));
        } else {
          await tx.insert(productVariants).values({ ...row, product_id: pid });
        }
      }
      return pid;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Proizvod ne postoji.') return { error: error.message };
    return { error: friendlyDbError(error) };
  }

  refreshShop();
  if (!id) redirect(`/admin/products/${productId}?novo=1`);
  return { success: 'Proizvod je spremljen.' };
}

export async function deleteProduct(productId: string) {
  await requireAdmin();
  const images = await getDb()
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.product_id, productId));
  // Past orders keep their snapshot (product_id → NULL).
  await getDb().delete(products).where(eq(products.id, productId));
  await deleteBlobs(images.map((i) => i.url));
  refreshShop();
  redirect('/admin/products');
}

/** Stores image URLs after a Vercel Blob client upload (see /api/admin/upload). */
export async function addProductImages(
  productId: string,
  uploaded: { url: string; alt?: string }[],
): Promise<ActionState> {
  await requireAdmin();
  const valid = uploaded.filter((u) => isAllowedImageUrl(u.url));
  if (valid.length === 0) return { error: 'Nema ispravnih slika.' };

  const db = getDb();
  const [last] = await db
    .select({ sort_order: productImages.sort_order })
    .from(productImages)
    .where(eq(productImages.product_id, productId))
    .orderBy(desc(productImages.sort_order))
    .limit(1);
  let sortOrder = (last?.sort_order ?? -1) + 1;

  await db.insert(productImages).values(
    valid.map((u) => ({
      product_id: productId,
      url: u.url,
      alt: u.alt?.trim().slice(0, 200) || null,
      sort_order: sortOrder++,
    })),
  );

  revalidatePath(`/admin/products/${productId}`);
  refreshShop();
  return { success: valid.length === 1 ? 'Slika je dodana.' : `Dodano slika: ${valid.length}.` };
}

export async function deleteProductImage(imageId: string) {
  await requireAdmin();
  const [image] = await getDb()
    .delete(productImages)
    .where(eq(productImages.id, imageId))
    .returning({ product_id: productImages.product_id, url: productImages.url });
  if (!image) return;
  await deleteBlobs([image.url]);
  revalidatePath(`/admin/products/${image.product_id}`);
  refreshShop();
}

/** Makes the image the main one (first) by moving it to the lowest sort_order. */
export async function makeMainProductImage(imageId: string) {
  await requireAdmin();
  const db = getDb();
  const [image] = await db
    .select({ product_id: productImages.product_id })
    .from(productImages)
    .where(eq(productImages.id, imageId));
  if (!image) return;
  const images = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.product_id, image.product_id))
    .orderBy(asc(productImages.sort_order));
  const ordered = [imageId, ...images.map((i) => i.id).filter((i) => i !== imageId)];
  await db.transaction(async (tx) => {
    for (const [index, id] of ordered.entries()) {
      await tx.update(productImages).set({ sort_order: index }).where(eq(productImages.id, id));
    }
  });
  revalidatePath(`/admin/products/${image.product_id}`);
  refreshShop();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(formData, 'id');
  const name = text(formData, 'name', 200);
  const slug = slugify(text(formData, 'slug', 200) || name);
  if (!name || !slug) return { error: 'Upišite naziv kategorije.' };

  const imageUrl = text(formData, 'image_url', 1000);
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return { error: 'Slika mora biti putanja na stranici (/…) ili učitana slika (Vercel Blob).' };
  }

  const category = {
    name,
    slug,
    description: text(formData, 'description', 2000) || null,
    image_url: imageUrl || null,
    parent_id: text(formData, 'parent_id') || null,
    sort_order: int(formData, 'sort_order'),
    is_active: formData.get('is_active') === 'on',
  };
  if (id && category.parent_id === id) return { error: 'Kategorija ne može biti sama sebi nadkategorija.' };

  try {
    if (id) await getDb().update(categories).set(category).where(eq(categories.id, id));
    else await getDb().insert(categories).values(category);
  } catch (error) {
    return { error: friendlyDbError(error) };
  }

  refreshShop();
  redirect('/admin/categories');
}

export async function deleteCategory(categoryId: string) {
  await requireAdmin();
  // Products keep existing (category_id → NULL); subcategories become top-level.
  await getDb().delete(categories).where(eq(categories.id, categoryId));
  refreshShop();
}

// ---------------------------------------------------------------------------
// Settings + shipping methods
// ---------------------------------------------------------------------------

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const shopName = text(formData, 'shop_name', 120);
  if (!shopName) return { error: 'Upišite naziv trgovine.' };
  const values = {
    shop_name: shopName,
    tagline: text(formData, 'tagline', 300) || null,
    contact_email: text(formData, 'contact_email', 200) || null,
    contact_phone: text(formData, 'contact_phone', 60) || null,
    address: text(formData, 'address', 300) || null,
    hero_title: text(formData, 'hero_title', 200) || null,
    hero_subtitle: text(formData, 'hero_subtitle', 500) || null,
  };
  await getDb()
    .insert(storeSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: storeSettings.id, set: values });
  refreshShop();
  return { success: 'Postavke su spremljene.' };
}

function isShippingType(value: string): value is ShippingMethodType {
  return (SHIPPING_METHOD_TYPES as readonly string[]).includes(value);
}

export async function saveShippingMethod(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(formData, 'id');
  const name = text(formData, 'name', 120);
  const type = text(formData, 'type');
  const price = parsePriceToCents(text(formData, 'price', 20) || '0');
  const freeOver = optionalCents(formData, 'free_over');
  const maxSubtotal = optionalCents(formData, 'max_subtotal');
  const countries = text(formData, 'countries', 200)
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));

  if (!name) return { error: 'Upišite naziv načina dostave.' };
  if (!isShippingType(type)) return { error: 'Nepoznata vrsta dostave.' };
  if (price === null) return { error: 'Cijena dostave nije ispravna.' };
  if (freeOver === undefined) return { error: 'Iznos za besplatnu dostavu nije ispravan.' };
  if (maxSubtotal === undefined) return { error: 'Najveći iznos narudžbe nije ispravan.' };

  const method = {
    name,
    description: text(formData, 'description', 500) || null,
    type,
    price_cents: price,
    free_over_cents: freeOver,
    max_subtotal_cents: maxSubtotal,
    countries: countries.length ? countries : null,
    sort_order: int(formData, 'sort_order'),
    is_active: formData.get('is_active') === 'on',
  };
  if (id) await getDb().update(shippingMethods).set(method).where(eq(shippingMethods.id, id));
  else await getDb().insert(shippingMethods).values(method);
  revalidatePath('/admin/settings');
  return { success: 'Način dostave je spremljen.' };
}

export async function deleteShippingMethod(id: string) {
  await requireAdmin();
  // Past orders keep the method name; shipping_method_id becomes NULL.
  await getDb().delete(shippingMethods).where(eq(shippingMethods.id, id));
  revalidatePath('/admin/settings');
}
