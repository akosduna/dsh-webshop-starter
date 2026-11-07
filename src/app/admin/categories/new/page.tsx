import Link from 'next/link';
import { CategoryForm } from '@/components/admin/category-form';
import { requireAdmin } from '@/lib/auth';

export default async function NewCategoryPage() {
  const { supabase } = await requireAdmin();
  const { data: parents } = await supabase
    .from('categories')
    .select('id, name')
    .is('parent_id', null)
    .order('sort_order');

  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="text-sm text-primary hover:underline">
        ← Kategorije
      </Link>
      <h1 className="text-2xl font-semibold">Nova kategorija</h1>
      <CategoryForm parents={parents ?? []} />
    </div>
  );
}
