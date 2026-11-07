import Link from 'next/link';
import { and, count, desc, eq, gte, inArray, isNull, lte, sql, sum } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/orders/order-details';
import { ModuleStatusCard } from '@/components/admin/module-status-card';
import { getDb } from '@/db';
import { orders, products, productVariants } from '@/db/schema';
import { safeQuery } from '@/db/utils';
import { requireAdmin } from '@/lib/auth/server';
import { formatDate, formatPrice } from '@/lib/utils';

const LOW_STOCK = 5;

async function loadDashboard() {
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [[paid], [toShip], [awaitingTransfer], recent, lowProducts, lowVariants] = await Promise.all([
    db
      .select({ total: sum(orders.total_cents).mapWith(Number), orders: count() })
      .from(orders)
      .where(and(eq(orders.payment_status, 'paid'), gte(orders.created_at, since))),
    db
      .select({ value: count() })
      .from(orders)
      .where(inArray(orders.status, ['paid', 'processing'])),
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.payment_method, 'bank_transfer'), eq(orders.status, 'awaiting_payment'))),
    db
      .select({
        id: orders.id,
        order_number: orders.order_number,
        email: orders.email,
        created_at: orders.created_at,
        status: orders.status,
        total_cents: orders.total_cents,
      })
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(8),
    // Products without variants (their own stock counts).
    db
      .select({ id: products.id, name: products.name, stock: products.stock_quantity })
      .from(products)
      .leftJoin(productVariants, eq(productVariants.product_id, products.id))
      .where(and(eq(products.is_active, true), lte(products.stock_quantity, LOW_STOCK), isNull(productVariants.id)))
      .limit(20),
    db
      .select({
        id: productVariants.id,
        product_id: productVariants.product_id,
        label: sql<string>`${products.name} || ' (' || ${productVariants.name} || ')'`,
        stock: productVariants.stock_quantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.product_id))
      .where(and(eq(productVariants.is_active, true), lte(productVariants.stock_quantity, LOW_STOCK)))
      .limit(20),
  ]);

  const lowStock = [
    ...lowProducts.map((p) => ({ id: p.id, productId: p.id, label: p.name, stock: p.stock })),
    ...lowVariants.map((v) => ({ id: v.id, productId: v.product_id, label: v.label, stock: v.stock })),
  ].sort((a, b) => a.stock - b.stock);

  return {
    revenue: paid?.total ?? 0,
    paidCount: paid?.orders ?? 0,
    toShip: toShip?.value ?? 0,
    awaitingTransfer: awaitingTransfer?.value ?? 0,
    recent,
    lowStock,
  };
}

export default async function AdminDashboard() {
  await requireAdmin();
  const data = await safeQuery('admin dashboard', loadDashboard, null);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Pregled</h1>
      {!data && (
        <Card className="text-sm text-destructive">
          Baza još nije pripremljena. Pokrenite migracije (npx drizzle-kit migrate) — vidi DATABASE-SETUP.md.
        </Card>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <p className="text-sm text-muted-foreground">Prihod (zadnjih 30 dana)</p>
              <p className="mt-1 text-2xl font-semibold">{formatPrice(data.revenue)}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Plaćene narudžbe (30 dana)</p>
              <p className="mt-1 text-2xl font-semibold">{data.paidCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Čeka slanje</p>
              <p className="mt-1 text-2xl font-semibold">{data.toShip}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Čeka uplatu virmanom</p>
              <Link
                href="/admin/orders?status=awaiting_payment"
                className="mt-1 block text-2xl font-semibold hover:text-primary"
              >
                {data.awaitingTransfer}
              </Link>
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
                {data.recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex flex-wrap items-center gap-3 p-4 text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">#{o.order_number}</span>
                      <span className="text-muted-foreground">{o.email}</span>
                      <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
                      <StatusBadge status={o.status} />
                      <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
                    </Link>
                  </li>
                ))}
                {data.recent.length === 0 && <li className="p-4 text-sm text-muted-foreground">Još nema narudžbi.</li>}
              </ul>
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">Niske zalihe (≤ {LOW_STOCK})</h2>
              {data.lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sve zalihe su u redu.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.lowStock.map((item) => (
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
        </>
      )}

      <ModuleStatusCard />
    </div>
  );
}
