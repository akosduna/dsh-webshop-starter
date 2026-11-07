import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, count, eq, isNull, ne } from 'drizzle-orm';
import { CategoryForm } from '@/components/admin/category-form';
import { getDb } from '@/db';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!UUID_RE.test(id)) notFound();

  const db = getDb();
  const [[category], parents, [children]] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        image_url: categories.image_url,
        parent_id: categories.parent_id,
        sort_order: categories.sort_order,
        is_active: categories.is_active,
      })
      .from(categories)
      .where(eq(categories.id, id)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(isNull(categories.parent_id), ne(categories.id, id)))
      .orderBy(asc(categories.sort_order)),
    db.select({ value: count() }).from(categories).where(eq(categories.parent_id, id)),
  ]);
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="text-sm text-primary hover:underline">
        ← Kategorije
      </Link>
      <h1 className="text-2xl font-semibold">{category.name}</h1>
      <CategoryForm category={category} parents={children?.value ? [] : parents} />
    </div>
  );
}
