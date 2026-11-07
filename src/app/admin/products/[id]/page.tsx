import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { ProductForm } from '@/components/admin/product-form';
import { ProductImagesManager } from '@/components/admin/product-images';
import { DeleteProductButton } from '@/components/admin/delete-buttons';
import { FormMessage } from '@/components/ui/form';
import { getDb } from '@/db';
import { categories, products } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';
import { toVariantOptions } from '@/lib/shop/catalog-utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const created = (await searchParams).novo === '1';
  await requireAdmin();
  if (!UUID_RE.test(id)) notFound();

  const db = getDb();
  const [product, categoryOptions] = await Promise.all([
    db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        images: { columns: { id: true, url: true, alt: true }, orderBy: (i, { asc: a }) => [a(i.sort_order)] },
        variants: { orderBy: (v, { asc: a }) => [a(v.sort_order)] },
      },
    }),
    db
      .select({ id: categories.id, name: categories.name, parent_id: categories.parent_id })
      .from(categories)
      .orderBy(asc(categories.sort_order), asc(categories.name)),
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
        images={product.images}
        uploadsEnabled={isModuleReady('blob_uploads')}
      />
      <ProductForm
        categories={categoryOptions}
        product={{
          ...product,
          variants: product.variants.map((v) => ({ ...v, options: toVariantOptions(v.options) })),
        }}
      />
    </div>
  );
}
