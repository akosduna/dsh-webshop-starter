import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { ProductForm } from '@/components/admin/product-form';
import { getDb } from '@/db';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';

export default async function NewProductPage() {
  await requireAdmin();
  const categoryOptions = await getDb()
    .select({ id: categories.id, name: categories.name, parent_id: categories.parent_id })
    .from(categories)
    .orderBy(asc(categories.sort_order), asc(categories.name));

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-primary hover:underline">
        ← Proizvodi
      </Link>
      <h1 className="text-2xl font-semibold">Novi proizvod</h1>
      <ProductForm categories={categoryOptions} />
      <p className="text-sm text-muted-foreground">Slike možete dodati nakon prvog spremanja.</p>
    </div>
  );
}
