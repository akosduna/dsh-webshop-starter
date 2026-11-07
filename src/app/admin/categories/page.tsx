import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { DeleteCategoryButton } from '@/components/admin/delete-buttons';
import { requireAdmin } from '@/lib/auth';

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, is_active, sort_order, products(count)')
    .order('sort_order')
    .order('name');

  const all = categories ?? [];
  const tree = all
    .filter((c) => !c.parent_id)
    .flatMap((parent) => [
      { ...parent, depth: 0 },
      ...all.filter((c) => c.parent_id === parent.id).map((c) => ({ ...c, depth: 1 })),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kategorije</h1>
        <Link href="/admin/categories/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" /> Nova kategorija
        </Link>
      </div>
      <Card className="p-0">
        <ul className="divide-y">
          {tree.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <Link
                href={`/admin/categories/${c.id}`}
                className={c.depth ? 'pl-6 hover:text-primary' : 'font-medium hover:text-primary'}
              >
                {c.depth ? '↳ ' : ''}
                {c.name}
              </Link>
              <span className="text-muted-foreground">/{c.slug}</span>
              <span className="text-muted-foreground">{c.products[0]?.count ?? 0} proizvoda</span>
              {!c.is_active && <Badge>Skrivena</Badge>}
              <span className="ml-auto">
                <DeleteCategoryButton categoryId={c.id} />
              </span>
            </li>
          ))}
          {tree.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nema kategorija.</li>}
        </ul>
      </Card>
      <p className="text-sm text-muted-foreground">
        Brisanjem kategorije proizvodi ostaju, ali bez kategorije; podkategorije postaju glavne kategorije.
      </p>
    </div>
  );
}
