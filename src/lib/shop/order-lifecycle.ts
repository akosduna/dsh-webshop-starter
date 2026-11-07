import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@/db/schema';
import { orderItems, orders, products, productVariants, type Order } from '@/db/schema';

/**
 * Payment + stock state machine. Database-agnostic (takes the Drizzle handle),
 * so the same code runs in the app and in the integration test.
 *
 * Stock rules:
 * - Bank transfer: stock is reserved when the order is created (createOrder),
 *   so nobody else can buy the last piece while the customer pays.
 * - Card payments (Stripe, Teya): stock is taken once, when the payment is
 *   confirmed (webhook / notify / success page — whichever comes first).
 * - Cancelling an order gives the reserved stock back exactly once.
 * - Unpaid bank transfers are not cancelled automatically (no cron): the admin
 *   runs "Otkaži neplaćene virmane" after BANK_TRANSFER_RESERVATION_DAYS.
 */

type AnyDb = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<AnyDb['transaction']>[0]>[0];
type DbOrTx = AnyDb | Tx;

export type StockLine = { product_id: string | null; variant_id: string | null; quantity: number };

export class OutOfStockError extends Error {
  constructor(public readonly line: StockLine) {
    super('Out of stock');
  }
}

/** Strict reservation: fails (throws OutOfStockError) instead of going below zero. Use inside a transaction. */
export async function reserveStock(tx: DbOrTx, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    if (line.variant_id) {
      const rows = await tx
        .update(productVariants)
        .set({ stock_quantity: sql`${productVariants.stock_quantity} - ${line.quantity}` })
        .where(and(eq(productVariants.id, line.variant_id), gte(productVariants.stock_quantity, line.quantity)))
        .returning({ id: productVariants.id });
      if (rows.length === 0) throw new OutOfStockError(line);
    } else if (line.product_id) {
      const rows = await tx
        .update(products)
        .set({ stock_quantity: sql`${products.stock_quantity} - ${line.quantity}` })
        .where(and(eq(products.id, line.product_id), gte(products.stock_quantity, line.quantity)))
        .returning({ id: products.id });
      if (rows.length === 0) throw new OutOfStockError(line);
    }
  }
}

/** After a confirmed payment: take stock, never below zero (the money is already in). */
async function takeStockAfterPayment(tx: DbOrTx, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    if (line.variant_id) {
      await tx
        .update(productVariants)
        .set({ stock_quantity: sql`greatest(${productVariants.stock_quantity} - ${line.quantity}, 0)` })
        .where(eq(productVariants.id, line.variant_id));
    } else if (line.product_id) {
      await tx
        .update(products)
        .set({ stock_quantity: sql`greatest(${products.stock_quantity} - ${line.quantity}, 0)` })
        .where(eq(products.id, line.product_id));
    }
  }
}

async function restoreStock(tx: DbOrTx, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    if (line.variant_id) {
      await tx
        .update(productVariants)
        .set({ stock_quantity: sql`${productVariants.stock_quantity} + ${line.quantity}` })
        .where(eq(productVariants.id, line.variant_id));
    } else if (line.product_id) {
      await tx
        .update(products)
        .set({ stock_quantity: sql`${products.stock_quantity} + ${line.quantity}` })
        .where(eq(products.id, line.product_id));
    }
  }
}

type PaymentState = Pick<
  Order,
  'status' | 'payment_status' | 'stock_decremented_at' | 'stock_restored_at'
>;

/** True while the order holds stock (taken and not given back). */
export function holdsStock(order: Pick<Order, 'stock_decremented_at' | 'stock_restored_at'>): boolean {
  return order.stock_decremented_at !== null && order.stock_restored_at === null;
}

export type PaidPlan =
  | { kind: 'already_paid' }
  | { kind: 'mark_paid'; takeStock: boolean; nextStatus: Order['status'] };

/** Pure decision for "a payment for this order arrived". */
export function planMarkPaid(order: PaymentState): PaidPlan {
  if (order.payment_status === 'paid') return { kind: 'already_paid' };
  const nextStatus =
    order.status === 'awaiting_payment' || order.status === 'cancelled' ? 'paid' : order.status;
  return { kind: 'mark_paid', takeStock: !holdsStock(order), nextStatus };
}

export type CancelPlan =
  | { kind: 'already_cancelled' }
  | { kind: 'not_cancellable'; reason: string }
  | { kind: 'cancel'; restoreStock: boolean };

/** Pure decision for "cancel this order". Shipped/delivered orders are returns, not cancellations. */
export function planCancel(order: PaymentState): CancelPlan {
  if (order.status === 'cancelled') return { kind: 'already_cancelled' };
  if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'completed') {
    return { kind: 'not_cancellable', reason: 'Poslana narudžba se ne može otkazati.' };
  }
  return { kind: 'cancel', restoreStock: holdsStock(order) };
}

export type PaidExtra = Partial<
  Pick<Order, 'teya_auth_code' | 'teya_card_mask' | 'teya_raw_response'>
>;

export type MarkPaidResult = 'paid' | 'already_paid' | 'not_found';

/**
 * Marks an order paid. Idempotent and safe under concurrency: the order row is
 * locked (SELECT … FOR UPDATE) so two webhooks arriving together take stock once.
 * Returns 'paid' only for the call that actually changed the order — that is
 * the one place to send "paid" e-mails.
 */
export async function markOrderPaid(
  db: AnyDb,
  orderId: string,
  extra: PaidExtra = {},
): Promise<MarkPaidResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        status: orders.status,
        payment_status: orders.payment_status,
        stock_decremented_at: orders.stock_decremented_at,
        stock_restored_at: orders.stock_restored_at,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!order) return 'not_found';

    const plan = planMarkPaid(order);
    if (plan.kind === 'already_paid') return 'already_paid';

    const now = new Date();
    if (plan.takeStock) {
      const lines = await tx
        .select({
          product_id: orderItems.product_id,
          variant_id: orderItems.variant_id,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));
      await takeStockAfterPayment(tx, lines);
    }

    await tx
      .update(orders)
      .set({
        ...extra,
        payment_status: 'paid',
        status: plan.nextStatus,
        paid_at: now,
        cancelled_at: null,
        ...(plan.takeStock ? { stock_decremented_at: now, stock_restored_at: null } : {}),
      })
      .where(eq(orders.id, orderId));
    return 'paid';
  });
}

export type CancelResult = 'cancelled' | 'already_cancelled' | 'not_found' | { error: string };

export async function cancelOrder(
  db: AnyDb,
  orderId: string,
  options: { paymentStatus?: 'failed' } = {},
): Promise<CancelResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        status: orders.status,
        payment_status: orders.payment_status,
        stock_decremented_at: orders.stock_decremented_at,
        stock_restored_at: orders.stock_restored_at,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!order) return 'not_found';

    const plan = planCancel(order);
    if (plan.kind === 'already_cancelled') return 'already_cancelled';
    if (plan.kind === 'not_cancellable') return { error: plan.reason };

    const now = new Date();
    if (plan.restoreStock) {
      const lines = await tx
        .select({
          product_id: orderItems.product_id,
          variant_id: orderItems.variant_id,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));
      await restoreStock(tx, lines);
    }

    await tx
      .update(orders)
      .set({
        status: 'cancelled',
        cancelled_at: now,
        ...(options.paymentStatus && order.payment_status !== 'paid'
          ? { payment_status: options.paymentStatus }
          : {}),
        ...(plan.restoreStock ? { stock_restored_at: now } : {}),
      })
      .where(eq(orders.id, orderId));
    return 'cancelled';
  });
}

/** Unpaid bank-transfer orders older than `days`: cancelled one by one, stock returned. */
export async function cancelStaleBankTransfers(db: AnyDb, days: number, now = new Date()) {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.payment_method, 'bank_transfer'),
        eq(orders.payment_status, 'unpaid'),
        inArray(orders.status, ['awaiting_payment']),
        lt(orders.created_at, cutoff),
      ),
    );
  let cancelled = 0;
  for (const row of stale) {
    if ((await cancelOrder(db, row.id)) === 'cancelled') cancelled += 1;
  }
  return cancelled;
}
