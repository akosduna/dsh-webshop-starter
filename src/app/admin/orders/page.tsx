import Link from 'next/link';
import { and, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/admin/action-button';
import { StatusBadge } from '@/components/orders/order-details';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';
import { bankReservationDays } from '@/lib/payments/bank-transfer';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  isOrderStatus,
  paymentMethodLabel,
} from '@/lib/shop/orders';
import { cn, formatDate, formatPrice } from '@/lib/utils';
import { cancelStaleBankTransfersAction } from './actions';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === 'string' && isOrderStatus(params.status) ? params.status : null;
  const q = typeof params.q === 'string' ? params.q.trim() : '';

  const filters: SQL[] = [];
  if (status) filters.push(eq(orders.status, status));
  if (q) {
    const asNumber = Number.parseInt(q.replace('#', ''), 10);
    filters.push(
      Number.isFinite(asNumber)
        ? eq(orders.order_number, asNumber)
        : ilike(orders.email, `%${q.replace(/[%_\\]/g, '')}%`),
    );
  }

  const rows = await getDb()
    .select({
      id: orders.id,
      order_number: orders.order_number,
      email: orders.email,
      created_at: orders.created_at,
      status: orders.status,
      payment_method: orders.payment_method,
      payment_status: orders.payment_status,
      total_cents: orders.total_cents,
      shipping_method_name: orders.shipping_method_name,
    })
    .from(orders)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(orders.created_at))
    .limit(200);

  const filterHref = (s: string | null) => (s ? `/admin/orders?status=${s}` : '/admin/orders');
  const days = bankReservationDays();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">Narudžbe</h1>
        {isModuleReady('bank_transfer') && (
          <ActionButton
            size="sm"
            action={cancelStaleBankTransfersAction}
            confirmText={`Otkazati neplaćene virmane starije od ${days} dana?`}
          >
            Otkaži neplaćene virmane (&gt; {days} dana)
          </ActionButton>
        )}
      </div>
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
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-muted/30">
                <td className="p-3 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-primary">
                    #{o.order_number}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(o.created_at)}</td>
                <td className="p-3">{o.email}</td>
                <td className="p-3 text-muted-foreground">{o.shipping_method_name}</td>
                <td className="p-3">
                  {paymentMethodLabel(o.payment_method)}
                  <span className="block text-xs text-muted-foreground">
                    {PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}
                  </span>
                </td>
                <td className="p-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="p-3 text-right font-medium">{formatPrice(o.total_cents)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
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
        „Čeka uplatu” su virmanske narudžbe bez uplate i kartične narudžbe kod kojih kupac nije dovršio plaćanje. Ne
        šalju se dok nisu plaćene.
      </p>
    </div>
  );
}
