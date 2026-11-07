import Link from 'next/link';
import { asc, isNull } from 'drizzle-orm';
import { CategoryForm } from '@/components/admin/category-form';
import { getDb } from '@/db';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';

export default async function NewCategoryPage() {
  await requireAdmin();
  const parents = await getDb()
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(isNull(categories.parent_id))
    .orderBy(asc(categories.sort_order));

  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="text-sm text-primary hover:underline">
        ← Kategorije
      </Link>
      <h1 className="text-2xl font-semibold">Nova kategorija</h1>
      <CategoryForm parents={parents} />
    </div>
  );
}
