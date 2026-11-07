import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';
import { ProductImagesManager } from '@/components/admin/product-images';
import { DeleteProductButton } from '@/components/admin/delete-buttons';
import { FormMessage } from '@/components/ui/form';
import { requireAdmin } from '@/lib/auth';
import { toVariantOptions } from '@/lib/shop/catalog-utils';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const created = (await searchParams).novo === '1';
  const { supabase } = await requireAdmin();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, slug, description, price_cents, sku, stock_quantity, category_id, option_names, is_active, is_featured, sort_order, product_images(id, url, alt, sort_order), product_variants(id, options, sku, price_cents, stock_quantity, is_active, sort_order)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('categories').select('id, name, parent_id').order('sort_order').order('name'),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/products" className="text-sm text-primary hover:underline">
          ← Proizvodi
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/proizvodi/${product.slug}`} className="text-sm text-primary hover:underline" target="_blank">
            Pogledaj u trgovini
          </Link>
          <DeleteProductButton productId={product.id} />
        </div>
      </div>
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      {created && <FormMessage type="success">Proizvod je izrađen. Sada dodajte slike.</FormMessage>}
      <ProductImagesManager
        productId={product.id}
        images={[...product.product_images].sort((a, b) => a.sort_order - b.sort_order)}
      />
      <ProductForm
        categories={categories ?? []}
        product={{
          ...product,
          variants: [...product.product_variants]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((v) => ({ ...v, options: toVariantOptions(v.options) })),
        }}
      />
    </div>
  );
}
