import 'server-only';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { sendOrderEmail } from '@/lib/email/order-emails';
import { cancelOrder, markOrderPaid, type MarkPaidResult, type PaidExtra } from './order-lifecycle';

/**
 * The single place where an order becomes paid (Stripe webhook / success page,
 * Teya notify / success, admin "Označi kao plaćeno"). Idempotent; the "paid"
 * side effects (stock, e-mail) run once, for the call that returns 'paid'.
 */
export async function confirmOrderPaid(orderId: string, extra: PaidExtra = {}): Promise<MarkPaidResult> {
  const result = await markOrderPaid(getDb(), orderId, extra);
  if (result === 'paid') {
    const [order] = await getDb()
      .select({ payment_method: orders.payment_method })
      .from(orders)
      .where(eq(orders.id, orderId));
    // ORDER PAID HOOK: add other "order paid" integrations (invoicing, ERP…) here.
    await sendOrderEmail(orderId, order?.payment_method === 'bank_transfer' ? 'paid' : 'received');
  }
  return result;
}

/**
 * Confirms the order of a succeeded PaymentIntent. Checks that the intent
 * belongs to the order and the amount/currency match before marking it paid.
 */
export async function confirmStripePayment(
  intent: Stripe.PaymentIntent,
): Promise<MarkPaidResult | 'ignored'> {
  const orderId = intent.metadata?.order_id;
  if (intent.status !== 'succeeded' || !orderId) return 'ignored';

  const [order] = await getDb()
    .select({
      id: orders.id,
      total_cents: orders.total_cents,
      currency: orders.currency,
      stripe_payment_intent_id: orders.stripe_payment_intent_id,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order || order.stripe_payment_intent_id !== intent.id) return 'ignored';

  if (
    intent.amount_received !== order.total_cents ||
    intent.currency.toLowerCase() !== order.currency.toLowerCase()
  ) {
    console.error(
      `[payments] amount mismatch for order ${order.id}: received ${intent.amount_received} ${intent.currency}, expected ${order.total_cents} ${order.currency}`,
    );
    return 'ignored';
  }

  return confirmOrderPaid(order.id);
}

export async function cancelOrderAndRestock(orderId: string, options: { paymentStatus?: 'failed' } = {}) {
  return cancelOrder(getDb(), orderId, options);
}
