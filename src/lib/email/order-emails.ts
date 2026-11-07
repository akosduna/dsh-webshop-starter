import 'server-only';

import { and, eq, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderEmails, orders, shipments, type OrderEmailKind } from '@/db/schema';
import { getShopName } from '@/lib/shop/catalog';
import { getBankDetails } from '@/lib/payments/bank-transfer';
import { formatIban } from '@/lib/payments/hub3';
import { isModuleReady } from '@/lib/modules';
import { orderBarcodeUrl, orderPublicUrl } from '@/lib/shop/order-access';
import { trackingUrlFor } from '@/lib/shipping/tracking-urls';
import { renderOrderEmail } from './templates';
import { sendEmail } from './send';

/**
 * Sends one order e-mail of a kind, at most once per order (order_emails has a
 * unique (order_id, kind) row; a failed send may be retried). Never throws:
 * an e-mail problem must not break checkout or payment confirmation.
 *
 * Called from exactly these places:
 *   bank_transfer → createOrder (bank transfer order created)
 *   received      → confirmOrderPaid for card payments
 *   paid          → confirmOrderPaid for bank transfers (admin marks paid)
 *   shipped       → admin sets status to "shipped"
 */
export async function sendOrderEmail(orderId: string, kind: OrderEmailKind): Promise<void> {
  if (!isModuleReady('order_emails')) return;
  try {
    const db = getDb();
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { order_items: true },
    });
    if (!order) return;

    // Claim the (order, kind) slot; a previous failed attempt can be retried.
    const claimed = await db
      .insert(orderEmails)
      .values({ order_id: orderId, kind, recipient: order.email, status: 'sending' })
      .onConflictDoUpdate({
        target: [orderEmails.order_id, orderEmails.kind],
        set: { status: 'sending', error_message: null },
        setWhere: eq(orderEmails.status, 'failed'),
      })
      .returning({ id: orderEmails.id });
    if (claimed.length === 0) return;
    const emailId = claimed[0].id;

    const bank = kind === 'bank_transfer' ? getBankDetails() : null;
    const [shipment] =
      kind === 'shipped'
        ? await db
            .select({ provider: shipments.provider, tracking_number: shipments.tracking_number })
            .from(shipments)
            .where(and(eq(shipments.order_id, orderId), ne(shipments.status, 'cancelled')))
            .limit(1)
        : [];

    const rendered = renderOrderEmail(kind, {
      shopName: await getShopName(),
      customerName: order.billing_address.full_name,
      orderNumber: order.order_number,
      orderUrl: orderPublicUrl(order),
      items: order.order_items.map((i) => ({
        name: i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name,
        quantity: i.quantity,
        lineTotalCents: i.line_total_cents,
      })),
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      shippingMethodName: order.shipping_method_name,
      bank:
        bank && order.payment_reference
          ? {
              iban: formatIban(bank.iban),
              recipientName: bank.recipientName,
              model: bank.model,
              reference: order.payment_reference,
              barcodeUrl: orderBarcodeUrl(order),
            }
          : null,
      tracking: shipment?.tracking_number
        ? {
            carrier: shipment.provider === 'boxnow' ? 'BOX NOW' : 'GLS',
            number: shipment.tracking_number,
            url: trackingUrlFor(shipment.provider, shipment.tracking_number),
          }
        : null,
    });

    const result = await sendEmail({ to: order.email, ...rendered });
    await db
      .update(orderEmails)
      .set(
        result.ok
          ? { status: 'sent', provider_id: result.id }
          : { status: 'failed', error_message: result.skipped ? result.reason : result.error },
      )
      .where(eq(orderEmails.id, emailId));
  } catch (error) {
    console.error(`[order-emails] ${kind} for ${orderId} failed`, error);
  }
}
