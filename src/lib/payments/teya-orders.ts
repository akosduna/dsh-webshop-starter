import 'server-only';

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderItems, orders } from '@/db/schema';
import { isModuleReady } from '@/lib/modules';
import { confirmOrderPaid } from '@/lib/shop/payments';
import { orderPublicPath } from '@/lib/shop/order-access';
import {
  buildPaymentParams,
  getTeyaConfig,
  parseTeyaAmount,
  readTeyaCallback,
  toTeyaOrderId,
  verifyOrderHash,
  type TeyaCallback,
  type TeyaSignedParams,
} from './teya';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TeyaOrder = {
  id: string;
  access_token: string;
  teya_order_id: string | null;
  total_cents: number;
  currency: string;
  payment_status: string;
};

const teyaOrderColumns = {
  id: orders.id,
  access_token: orders.access_token,
  teya_order_id: orders.teya_order_id,
  total_cents: orders.total_cents,
  currency: orders.currency,
  payment_status: orders.payment_status,
};

/** Signed form for the Teya payment page (new order or retry). */
export async function teyaParamsForOrder(orderId: string): Promise<TeyaSignedParams | null> {
  if (!isModuleReady('teya')) return null;
  const config = getTeyaConfig();
  const order = await getDb().query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.payment_method, 'teya')),
    with: { order_items: true },
  });
  if (!order || order.payment_status === 'paid' || order.status === 'cancelled') return null;

  const teyaOrderId = order.teya_order_id ?? toTeyaOrderId(order.order_number, config.orderPrefix);
  if (!order.teya_order_id) {
    await getDb().update(orders).set({ teya_order_id: teyaOrderId }).where(eq(orders.id, order.id));
  }

  const lines = order.order_items.map((item: typeof orderItems.$inferSelect) => ({
    description: item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name,
    count: item.quantity,
    unitAmount: item.unit_price_cents,
    totalAmount: item.line_total_cents,
  }));
  if (order.shipping_cents > 0) {
    lines.push({
      description: order.shipping_method_name,
      count: 1,
      unitAmount: order.shipping_cents,
      totalAmount: order.shipping_cents,
    });
  }

  return buildPaymentParams(config, {
    orderId: teyaOrderId,
    amountCents: order.total_cents,
    buyerName: order.billing_address.full_name,
    buyerEmail: order.email,
    reference: order.id,
    cartItems: lines,
  });
}

/** Lookup by our UUID (reference) first, then by the Teya order id. */
async function findOrder(cb: TeyaCallback, allowTeyaIdLookup: boolean): Promise<TeyaOrder | null> {
  const db = getDb();
  if (cb.reference && UUID_RE.test(cb.reference)) {
    const [row] = await db.select(teyaOrderColumns).from(orders).where(eq(orders.id, cb.reference));
    if (row) {
      // An unsigned return must also carry the matching Teya order id, when it has one.
      if (!allowTeyaIdLookup && cb.orderId && row.teya_order_id && row.teya_order_id !== cb.orderId) {
        return null;
      }
      return row;
    }
  }
  if (allowTeyaIdLookup && cb.orderId) {
    const [row] = await db.select(teyaOrderColumns).from(orders).where(eq(orders.teya_order_id, cb.orderId));
    if (row) return row;
  }
  return null;
}

function amountMatches(cb: TeyaCallback, order: TeyaOrder): boolean {
  return (
    parseTeyaAmount(cb.amount) === order.total_cents &&
    cb.currency.toUpperCase() === order.currency.toUpperCase()
  );
}

function hashIsValid(cb: TeyaCallback, secretKey: string): boolean {
  if (!cb.orderId || !cb.amount || !cb.orderHash) return false;
  return verifyOrderHash({
    secretKey,
    orderId: cb.orderId,
    amount: cb.amount,
    currency: cb.currency,
    orderHash: cb.orderHash,
  });
}

async function markPaidFromCallback(cb: TeyaCallback, order: TeyaOrder) {
  if (!amountMatches(cb, order)) {
    console.error('[teya] amount mismatch', { order: order.id, amount: cb.amount, currency: cb.currency });
    return;
  }
  await confirmOrderPaid(order.id, {
    teya_auth_code: cb.authCode,
    teya_card_mask: cb.cardMask,
    teya_raw_response: cb.raw,
  });
}

/** Server-to-server notify (the confirmation that counts). Never throws. */
export async function handleTeyaNotify(raw: Record<string, string>): Promise<void> {
  const config = getTeyaConfig();
  const cb = readTeyaCallback(raw, config.currency);
  if (!hashIsValid(cb, config.secretKey)) {
    console.error('[teya/notify] invalid or missing orderhash', { orderId: cb.orderId });
    return;
  }
  const order = await findOrder(cb, true);
  if (!order) {
    console.error('[teya/notify] order not found', cb.orderId);
    return;
  }
  const isSuccess = cb.status === 'ok' || cb.status === 'success' || cb.status === '';
  if (isSuccess) {
    await markPaidFromCallback(cb, order);
  } else if (order.payment_status === 'unpaid') {
    await getDb()
      .update(orders)
      .set({ payment_status: 'failed', teya_raw_response: cb.raw })
      .where(and(eq(orders.id, order.id), eq(orders.payment_status, 'unpaid')));
  }
}

/** Browser return after success. Marks paid as a fallback when the hash is valid; returns where to send the buyer. */
export async function handleTeyaSuccessReturn(raw: Record<string, string>): Promise<string> {
  const config = getTeyaConfig();
  const cb = readTeyaCallback(raw, config.currency);
  const valid = hashIsValid(cb, config.secretKey);
  const order = await findOrder(cb, valid);
  if (!order) return '/kosarica';
  if (valid) {
    await markPaidFromCallback(cb, order);
    return orderPublicPath(order);
  }
  // Unsigned: no token in the URL; the checkout cookie still opens the page.
  return `/naplata/uspjeh?order=${order.id}`;
}

/** Browser return after cancel / error (unsigned): acts only on an order found by our UUID. */
export async function handleTeyaFailureReturn(raw: Record<string, string>, kind: 'cancel' | 'error'): Promise<string> {
  const config = getTeyaConfig();
  const cb = readTeyaCallback(raw, config.currency);
  const order = await findOrder(cb, false);
  if (!order) return '/kosarica';
  if (kind === 'error' && order.payment_status === 'unpaid') {
    await getDb()
      .update(orders)
      .set({ payment_status: 'failed' })
      .where(and(eq(orders.id, order.id), eq(orders.payment_status, 'unpaid')));
  }
  return `/naplata/uspjeh?order=${order.id}&teya=${kind === 'cancel' ? 'odustao' : 'greska'}`;
}
