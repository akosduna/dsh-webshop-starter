import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import { cancelOrder, markOrderPaid, planCancel, planMarkPaid, reserveStock } from './order-lifecycle';

const fresh = {
  status: 'awaiting_payment' as const,
  payment_status: 'unpaid' as const,
  stock_decremented_at: null,
  stock_restored_at: null,
};
const t = new Date('2026-01-01T00:00:00Z');

describe('pure plans', () => {
  test('card order: first payment takes stock, second is a no-op', () => {
    assert.deepEqual(planMarkPaid(fresh), { kind: 'mark_paid', takeStock: true, nextStatus: 'paid' });
    assert.deepEqual(planMarkPaid({ ...fresh, status: 'paid', payment_status: 'paid', stock_decremented_at: t }), {
      kind: 'already_paid',
    });
  });

  test('bank transfer: stock already reserved, paying does not take it again', () => {
    assert.deepEqual(planMarkPaid({ ...fresh, stock_decremented_at: t }), {
      kind: 'mark_paid',
      takeStock: false,
      nextStatus: 'paid',
    });
  });

  test('late payment on a cancelled order takes stock again', () => {
    const cancelled = { ...fresh, status: 'cancelled' as const, stock_decremented_at: t, stock_restored_at: t };
    assert.deepEqual(planMarkPaid(cancelled), { kind: 'mark_paid', takeStock: true, nextStatus: 'paid' });
  });

  test('cancel restores only held stock, once', () => {
    assert.deepEqual(planCancel({ ...fresh, stock_decremented_at: t }), { kind: 'cancel', restoreStock: true });
    assert.deepEqual(planCancel(fresh), { kind: 'cancel', restoreStock: false });
    assert.deepEqual(planCancel({ ...fresh, status: 'cancelled' }), { kind: 'already_cancelled' });
    assert.equal(planCancel({ ...fresh, status: 'shipped' }).kind, 'not_cancellable');
  });
});

// Runs against a real Postgres when TEST_DATABASE_URL points at a migrated database
// (e.g. the Docker database from DATABASE-SETUP.md). Skipped otherwise.
const url = process.env.TEST_DATABASE_URL;

describe('database: idempotent paid marking', { skip: !url && 'TEST_DATABASE_URL not set' }, () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let productId: string;

  before(async () => {
    pool = new Pool({ connectionString: url, max: 4 });
    db = drizzle({ client: pool, schema });
    const [product] = await db
      .insert(schema.products)
      .values({ name: 'Test', slug: `test-${Date.now()}`, price_cents: 1000, stock_quantity: 10 })
      .returning({ id: schema.products.id });
    productId = product.id;
  });

  after(async () => {
    await db.delete(schema.products).where(eq(schema.products.id, productId));
    await pool.end();
  });

  async function stock() {
    const [row] = await db
      .select({ stock: schema.products.stock_quantity })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    return row.stock;
  }

  async function createOrder(paymentMethod: 'stripe' | 'bank_transfer', quantity: number) {
    const [order] = await db
      .insert(schema.orders)
      .values({
        access_token: 'test',
        email: 'test@example.com',
        payment_method: paymentMethod,
        shipping_method_name: 'Test',
        shipping_method_type: 'pickup',
        subtotal_cents: 1000 * quantity,
        total_cents: 1000 * quantity,
        billing_address: { full_name: 'Test', street: 'Ulica 1', city: 'Zagreb', postal_code: '10000', country: 'HR' },
      })
      .returning({ id: schema.orders.id });
    await db.insert(schema.orderItems).values({
      order_id: order.id,
      product_id: productId,
      product_name: 'Test',
      unit_price_cents: 1000,
      quantity,
      line_total_cents: 1000 * quantity,
    });
    return order.id;
  }

  test('two concurrent confirmations take stock once', async () => {
    const before = await stock();
    const orderId = await createOrder('stripe', 2);
    const results = await Promise.all([markOrderPaid(db, orderId), markOrderPaid(db, orderId)]);
    assert.deepEqual([...results].sort(), ['already_paid', 'paid']);
    assert.equal(await markOrderPaid(db, orderId), 'already_paid');
    assert.equal(await stock(), before - 2);
    await db.delete(schema.orders).where(eq(schema.orders.id, orderId));
  });

  test('bank transfer: reserved at creation, paid keeps it, cancel gives it back once', async () => {
    const before = await stock();
    const orderId = await createOrder('bank_transfer', 3);
    await db.transaction(async (tx) => {
      await reserveStock(tx, [{ product_id: productId, variant_id: null, quantity: 3 }]);
      await tx.update(schema.orders).set({ stock_decremented_at: new Date() }).where(eq(schema.orders.id, orderId));
    });
    assert.equal(await stock(), before - 3);

    assert.equal(await cancelOrder(db, orderId), 'cancelled');
    assert.equal(await cancelOrder(db, orderId), 'already_cancelled');
    assert.equal(await stock(), before);
    await db.delete(schema.orders).where(eq(schema.orders.id, orderId));
  });

  test('reservation never goes below zero', async () => {
    await assert.rejects(
      db.transaction((tx) => reserveStock(tx, [{ product_id: productId, variant_id: null, quantity: 999 }])),
    );
  });
});
