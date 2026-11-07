import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/orders/order-details';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatPrice } from '@/lib/utils';

const LOW_STOCK = 5;

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const since = daysAgoIso(30);

  const [paidOrders, toShip, recent, lowProducts, lowVariants] = await Promise.all([
    supabase.from('orders').select('total_cents').eq('payment_status', 'paid').gte('created_at', since),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'processing']),
    supabase
      .from('orders')
      .select('id, order_number, email, created_at, status, total_cents')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('id, name, stock_quantity, product_variants(id)')
      .lte('stock_quantity', LOW_STOCK)
      .eq('is_active', true)
      .limit(20),
    supabase
      .from('product_variants')
      .select('id, name, stock_quantity, product_id, products(name)')
      .lte('stock_quantity', LOW_STOCK)
      .eq('is_active', true)
      .limit(20),
  ]);

  const revenue = (paidOrders.data ?? []).reduce((sum, o) => sum + o.total_cents, 0);
  const lowStock = [
    ...(lowProducts.data ?? [])
      .filter((p) => p.product_variants.length === 0)
      .map((p) => ({ id: p.id, productId: p.id, label: p.name, stock: p.stock_quantity })),
    ...(lowVariants.data ?? []).map((v) => ({
      id: v.id,
      productId: v.product_id,
      label: `${v.products?.name ?? 'Proizvod'} (${v.name})`,
      stock: v.stock_quantity,
    })),
  ].sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Pregled</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Prihod (zadnjih 30 dana)</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(revenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Plaćene narudžbe (30 dana)</p>
          <p className="mt-1 text-2xl font-semibold">{paidOrders.data?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Čeka slanje</p>
          <p className="mt-1 text-2xl font-semibold">{toShip.count ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-0">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-semibold">Zadnje narudžbe</h2>
            <Link href="/admin/orders" className="text-sm text-primary hover:underline">
              Sve narudžbe
            </Link>
          </div>
          <ul className="divide-y border-t">
            {(recent.data ?? []).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-3 p-4 text-sm hover:bg-muted/50">
                  <span className="font-medium">#{o.order_number}</span>
                  <span className="text-muted-foreground">{o.email}</span>
                  <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
                </Link>
              </li>
            ))}
            {!recent.data?.length && <li className="p-4 text-sm text-muted-foreground">Još nema narudžbi.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Niske zalihe (≤ {LOW_STOCK})</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sve zalihe su u redu.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lowStock.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <Link href={`/admin/products/${item.productId}`} className="hover:text-primary">
                    {item.label}
                  </Link>
                  <span className={item.stock === 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {item.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
