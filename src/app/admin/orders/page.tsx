import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/orders/order-details';
import { requireAdmin } from '@/lib/auth';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, isOrderStatus } from '@/lib/shop/orders';
import { cn, formatDate, formatPrice } from '@/lib/utils';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === 'string' && isOrderStatus(params.status) ? params.status : null;
  const q = typeof params.q === 'string' ? params.q.trim() : '';

  let query = supabase
    .from('orders')
    .select('id, order_number, email, created_at, status, payment_status, total_cents, shipping_method_name')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);
  if (q) {
    const asNumber = Number.parseInt(q.replace('#', ''), 10);
    query = Number.isFinite(asNumber)
      ? query.eq('order_number', asNumber)
      : query.ilike('email', `%${q.replace(/[%_\\]/g, '')}%`);
  }
  const { data: orders, error } = await query;

  const filterHref = (s: string | null) => (s ? `/admin/orders?status=${s}` : '/admin/orders');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Narudžbe</h1>
      <div className="flex flex-wrap items-center gap-2">
        {[null, ...ORDER_STATUSES].map((s) => (
          <Link
            key={s ?? 'all'}
            href={filterHref(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              s === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {s ? ORDER_STATUS_LABELS[s] : 'Sve'}
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Broj narudžbe ili e-mail"
            aria-label="Traži narudžbe"
            className="h-9 w-56 rounded-md border bg-card px-3 text-sm"
          />
        </form>
      </div>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Broj</th>
              <th className="p-3 font-medium">Datum</th>
              <th className="p-3 font-medium">Kupac</th>
              <th className="p-3 font-medium">Dostava</th>
              <th className="p-3 font-medium">Plaćanje</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Iznos</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-muted/30">
                <td className="p-3 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-primary">
                    #{o.order_number}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(o.created_at)}</td>
                <td className="p-3">{o.email}</td>
                <td className="p-3 text-muted-foreground">{o.shipping_method_name}</td>
                <td className="p-3">{PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}</td>
                <td className="p-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="p-3 text-right font-medium">{formatPrice(o.total_cents)}</td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Nema narudžbi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">
        „Čeka plaćanje” su narudžbe kod kojih kupac nije dovršio plaćanje karticom. Ne šalju se.
      </p>
    </div>
  );
}
