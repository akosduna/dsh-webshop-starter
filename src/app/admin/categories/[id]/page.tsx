import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryForm } from '@/components/admin/category-form';
import { requireAdmin } from '@/lib/auth';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: category }, { data: parents }, { count: childCount }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, description, image_url, parent_id, sort_order, is_active')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('categories').select('id, name').is('parent_id', null).neq('id', id).order('sort_order'),
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', id),
  ]);
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="text-sm text-primary hover:underline">
        ← Kategorije
      </Link>
      <h1 className="text-2xl font-semibold">{category.name}</h1>
      <CategoryForm category={category} parents={childCount ? [] : (parents ?? [])} />
    </div>
  );
}
