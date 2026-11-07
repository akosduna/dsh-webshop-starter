'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { isOrderStatus } from '@/lib/shop/orders';
import { parsePriceToCents, slugify } from '@/lib/utils';
import type { Json } from '@/types/database';

export type ActionState = { error?: string; success?: string } | null;

const BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

function text(formData: FormData, key: string, max = 500): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function int(formData: FormData, key: string, fallback = 0): number {
  const n = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Refresh every cached storefront page after catalog/settings changes. */
function refreshShop() {
  revalidatePath('/', 'layout');
}

function friendlyDbError(message: string): string {
  if (message.includes('duplicate key') && message.includes('slug')) {
    return 'Taj URL (slug) već postoji. Odaberite drugi.';
  }
  return message;
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
  const { supabase } = await requireAdmin();

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

  const variantRows = [];
  for (const [index, v] of variants.entries()) {
    const values = optionNames.map((n) => (v.options[n] ?? '').trim());
    if (optionNames.length === 0 || values.some((x) => !x)) {
      return { error: `Varijanta ${index + 1}: ispunite sve opcije (${optionNames.join(', ') || 'najprije upišite nazive opcija'}).` };
    }
    const variantPrice = v.price.trim() ? parsePriceToCents(v.price) : null;
    if (v.price.trim() && variantPrice === null) {
      return { error: `Varijanta ${index + 1}: cijena nije ispravna.` };
    }
    const stock = Number.parseInt(v.stock, 10);
    variantRows.push({
      id: v.id,
      name: values.join(' / '),
      options: Object.fromEntries(optionNames.map((n, i) => [n, values[i]])) as Json,
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
  if (id) {
    const { error } = await supabase.from('products').update(product).eq('id', id);
    if (error) return { error: friendlyDbError(error.message) };
  } else {
    const { data, error } = await supabase.from('products').insert(product).select('id').single();
    if (error || !data) return { error: friendlyDbError(error?.message ?? 'Spremanje nije uspjelo.') };
    productId = data.id;
  }

  // Sync variants: delete removed ones, update existing, insert new.
  const { data: existing } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  const keepIds = new Set(variantRows.map((v) => v.id).filter(Boolean));
  const toDelete = (existing ?? []).map((v) => v.id).filter((vid) => !keepIds.has(vid));
  if (toDelete.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', toDelete);
    if (error) return { error: error.message };
  }
  for (const { id: variantId, ...row } of variantRows) {
    const { error } = variantId
      ? await supabase.from('product_variants').update(row).eq('id', variantId).eq('product_id', productId)
      : await supabase.from('product_variants').insert({ ...row, product_id: productId });
    if (error) return { error: `Varijanta „${row.name}”: ${error.message}` };
  }

  refreshShop();
  if (!id) redirect(`/admin/products/${productId}?novo=1`);
  return { success: 'Proizvod je spremljen.' };
}

export async function deleteProduct(productId: string) {
  const { supabase } = await requireAdmin();
  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId);
  const paths = (images ?? []).map((i) => i.storage_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from('products').delete().eq('id', productId);
  refreshShop();
  redirect('/admin/products');
}

export async function uploadProductImages(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const productId = text(formData, 'product_id');
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (!productId || files.length === 0) return { error: 'Odaberite barem jednu sliku.' };

  const { data: last } = await supabase
    .from('product_images')
    .select('sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  let sortOrder = (last?.sort_order ?? -1) + 1;

  for (const file of files) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return { error: `${file.name}: dopušteni su JPG, PNG, WebP, AVIF i GIF.` };
    if (file.size > MAX_IMAGE_BYTES) return { error: `${file.name}: najveća veličina je 5 MB.` };

    const path = `${productId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (uploadError) return { error: `Učitavanje nije uspjelo: ${uploadError.message}` };

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error } = await supabase.from('product_images').insert({
      product_id: productId,
      url: publicUrl,
      storage_path: path,
      alt: text(formData, 'alt', 200) || null,
      sort_order: sortOrder++,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/products/${productId}`);
  refreshShop();
  return { success: files.length === 1 ? 'Slika je dodana.' : `Dodano slika: ${files.length}.` };
}

export async function deleteProductImage(imageId: string) {
  const { supabase } = await requireAdmin();
  const { data: image } = await supabase
    .from('product_images')
    .select('product_id, storage_path')
    .eq('id', imageId)
    .maybeSingle();
  if (!image) return;
  if (image.storage_path) await supabase.storage.from(BUCKET).remove([image.storage_path]);
  await supabase.from('product_images').delete().eq('id', imageId);
  revalidatePath(`/admin/products/${image.product_id}`);
  refreshShop();
}

/** Makes the image the main one (first) by moving it to the lowest sort_order. */
export async function makeMainProductImage(imageId: string) {
  const { supabase } = await requireAdmin();
  const { data: image } = await supabase
    .from('product_images')
    .select('product_id')
    .eq('id', imageId)
    .maybeSingle();
  if (!image) return;
  const { data: images } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', image.product_id)
    .order('sort_order');
  const ordered = [imageId, ...(images ?? []).map((i) => i.id).filter((i) => i !== imageId)];
  await Promise.all(
    ordered.map((id, index) => supabase.from('product_images').update({ sort_order: index }).eq('id', id)),
  );
  revalidatePath(`/admin/products/${image.product_id}`);
  refreshShop();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = text(formData, 'id');
  const name = text(formData, 'name', 200);
  const slug = slugify(text(formData, 'slug', 200) || name);
  if (!name || !slug) return { error: 'Upišite naziv kategorije.' };

  const category = {
    name,
    slug,
    description: text(formData, 'description', 2000) || null,
    image_url: text(formData, 'image_url', 1000) || null,
    parent_id: text(formData, 'parent_id') || null,
    sort_order: int(formData, 'sort_order'),
    is_active: formData.get('is_active') === 'on',
  };
  if (id && category.parent_id === id) return { error: 'Kategorija ne može biti sama sebi nadkategorija.' };

  const { error } = id
    ? await supabase.from('categories').update(category).eq('id', id)
    : await supabase.from('categories').insert(category);
  if (error) return { error: friendlyDbError(error.message) };

  refreshShop();
  redirect('/admin/categories');
}

export async function deleteCategory(categoryId: string) {
  const { supabase } = await requireAdmin();
  // Products keep existing (category_id → NULL); subcategories become top-level.
  await supabase.from('categories').delete().eq('id', categoryId);
  refreshShop();
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function updateOrderStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const orderId = text(formData, 'order_id');
  const status = text(formData, 'status');
  if (!isOrderStatus(status)) return { error: 'Nepoznat status.' };
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  // HOOK: notify the customer about the status change (e.g. "Poslano").
  return { success: 'Status je ažuriran.' };
}

// ---------------------------------------------------------------------------
// Settings + shipping methods
// ---------------------------------------------------------------------------

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const shopName = text(formData, 'shop_name', 120);
  if (!shopName) return { error: 'Upišite naziv trgovine.' };
  const { error } = await supabase
    .from('store_settings')
    .update({
      shop_name: shopName,
      tagline: text(formData, 'tagline', 300) || null,
      contact_email: text(formData, 'contact_email', 200) || null,
      contact_phone: text(formData, 'contact_phone', 60) || null,
      address: text(formData, 'address', 300) || null,
      hero_title: text(formData, 'hero_title', 200) || null,
      hero_subtitle: text(formData, 'hero_subtitle', 500) || null,
    })
    .eq('id', 1);
  if (error) return { error: error.message };
  refreshShop();
  return { success: 'Postavke su spremljene.' };
}

export async function saveShippingMethod(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = text(formData, 'id');
  const name = text(formData, 'name', 120);
  const price = parsePriceToCents(text(formData, 'price', 20) || '0');
  const freeOverRaw = text(formData, 'free_over', 20);
  const freeOver = freeOverRaw ? parsePriceToCents(freeOverRaw) : null;
  const type = text(formData, 'type') === 'pickup' ? 'pickup' : 'delivery';
  if (!name) return { error: 'Upišite naziv načina dostave.' };
  if (price === null) return { error: 'Cijena dostave nije ispravna.' };
  if (freeOverRaw && freeOver === null) return { error: 'Iznos za besplatnu dostavu nije ispravan.' };

  const method = {
    name,
    description: text(formData, 'description', 500) || null,
    type,
    price_cents: price,
    free_over_cents: freeOver,
    sort_order: int(formData, 'sort_order'),
    is_active: formData.get('is_active') === 'on',
  };
  const { error } = id
    ? await supabase.from('shipping_methods').update(method).eq('id', id)
    : await supabase.from('shipping_methods').insert(method);
  if (error) return { error: error.message };
  revalidatePath('/admin/settings');
  return { success: 'Način dostave je spremljen.' };
}

export async function deleteShippingMethod(id: string) {
  const { supabase } = await requireAdmin();
  // Past orders keep the method name; shipping_method_id becomes NULL.
  await supabase.from('shipping_methods').delete().eq('id', id);
  revalidatePath('/admin/settings');
}
