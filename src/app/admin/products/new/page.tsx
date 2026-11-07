import Link from 'next/link';
import { ProductForm } from '@/components/admin/product-form';
import { requireAdmin } from '@/lib/auth';

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .order('sort_order')
    .order('name');

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-primary hover:underline">
        ← Proizvodi
      </Link>
      <h1 className="text-2xl font-semibold">Novi proizvod</h1>
      <ProductForm categories={categories ?? []} />
      <p className="text-sm text-muted-foreground">Slike možete dodati nakon prvog spremanja.</p>
    </div>
  );
}
