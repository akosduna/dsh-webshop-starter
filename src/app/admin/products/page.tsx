import Link from 'next/link';
import { desc, ilike, or } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { ProductImage } from '@/components/ui/product-image';
import { getDb } from '@/db';
import { products } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { formatPrice } from '@/lib/utils';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const term = `%${q.replace(/[%_\\]/g, '')}%`;

  const rows = await getDb().query.products.findMany({
    columns: {
      id: true,
      name: true,
      sku: true,
      price_cents: true,
      stock_quantity: true,
      is_active: true,
      is_featured: true,
    },
    with: {
      category: { columns: { name: true } },
      images: { columns: { url: true }, orderBy: (i, { asc }) => [asc(i.sort_order)], limit: 1 },
      variants: { columns: { stock_quantity: true } },
    },
    where: q ? or(ilike(products.name, term), ilike(products.sku, term)) : undefined,
    orderBy: [desc(products.created_at)],
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Proizvodi</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" /> Novi proizvod
        </Link>
      </div>
      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Traži po nazivu ili šifri…" aria-label="Traži proizvode" />
      </form>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Proizvod</th>
              <th className="p-3 font-medium">Kategorija</th>
              <th className="p-3 font-medium">Cijena</th>
              <th className="p-3 font-medium">Zaliha</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => {
              const stock = p.variants.length
                ? p.variants.reduce((s, v) => s + v.stock_quantity, 0)
                : p.stock_quantity;
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                        <ProductImage src={p.images[0]?.url ?? null} alt={p.name} sizes="40px" />
                      </span>
                      <span>
                        {p.name}
                        {p.sku && <span className="block text-xs text-muted-foreground">{p.sku}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category?.name ?? '—'}</td>
                  <td className="p-3">{formatPrice(p.price_cents)}</td>
                  <td className={stock === 0 ? 'p-3 text-destructive' : 'p-3'}>
                    {stock}
                    {p.variants.length > 0 && (
                      <span className="text-xs text-muted-foreground"> ({p.variants.length} var.)</span>
                    )}
                  </td>
                  <td className="space-x-1 p-3">
                    <Badge tone={p.is_active ? 'success' : 'neutral'}>{p.is_active ? 'Aktivan' : 'Skriven'}</Badge>
                    {p.is_featured && <Badge tone="primary">Izdvojen</Badge>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Nema proizvoda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
