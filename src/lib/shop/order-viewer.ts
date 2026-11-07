import 'server-only';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { canViewOrder, orderAccessCookieName } from './order-access';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadOrderWithItems(orderId: string) {
  if (!UUID_RE.test(orderId)) return null;
  return (
    (await getDb().query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { order_items: true, shipments: { columns: { label_pdf: false } } },
    })) ?? null
  );
}

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof loadOrderWithItems>>>;

/**
 * The order if the current visitor may see it (owner, admin, or a valid
 * access token from the link / checkout cookie), otherwise null.
 */
export async function loadViewableOrder(orderId: string, token?: string | null) {
  const order = await loadOrderWithItems(orderId);
  if (!order) return null;
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const allowed = canViewOrder(order, {
    userId: user?.id ?? null,
    isAdmin: user?.isAdmin ?? false,
    tokens: [token, cookieStore.get(orderAccessCookieName(order.id))?.value],
  });
  return allowed ? order : null;
}
