import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/orders/order-details';
import { requireUser } from '@/lib/auth';
import { formatDate, formatPrice } from '@/lib/utils';

export const metadata: Metadata = { title: 'Moje narudžbe', robots: { index: false } };

export default async function MyOrdersPage() {
  const { user, supabase } = await requireUser('/moj-racun/narudzbe');
  // Orders placed as a guest with the same e-mail are not linked automatically.
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, created_at, status, total_cents')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Narudžbe</h1>
      {!orders?.length ? (
        <Card className="text-center text-muted-foreground">Još nemate narudžbi.</Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {orders.map((o) => (
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
