import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/orders/order-details';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { requireUser } from '@/lib/auth/server';
import { formatDate, formatPrice } from '@/lib/utils';

export const metadata: Metadata = { title: 'Moje narudžbe', robots: { index: false } };

export default async function MyOrdersPage() {
  const user = await requireUser('/moj-racun/narudzbe');
  // Orders placed as a guest with the same e-mail are not linked automatically.
  const rows = await getDb()
    .select({
      id: orders.id,
      order_number: orders.order_number,
      created_at: orders.created_at,
      status: orders.status,
      total_cents: orders.total_cents,
    })
    .from(orders)
    .where(eq(orders.user_id, user.id))
    .orderBy(desc(orders.created_at));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Narudžbe</h1>
      {rows.length === 0 ? (
        <Card className="text-center text-muted-foreground">Još nemate narudžbi.</Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {rows.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/moj-racun/narudzbe/${o.id}`}
                  className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/50"
                >
                  <span className="font-medium">#{o.order_number}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
