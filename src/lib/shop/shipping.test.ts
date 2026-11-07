import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsAddress, needsPickupPoint, quoteShipping, type ShippingMethod } from './shipping';

const method = (over: Partial<ShippingMethod>): ShippingMethod => ({
  id: 'm',
  name: 'M',
  description: null,
  type: 'delivery',
  price_cents: 499,
  free_over_cents: 5000,
  max_subtotal_cents: null,
  countries: null,
  ...over,
});

test('price below and above the free-shipping threshold', () => {
  assert.deepEqual(quoteShipping(method({}), 4999), { available: true, priceCents: 499 });
  assert.deepEqual(quoteShipping(method({}), 5000), { available: true, priceCents: 0 });
  assert.deepEqual(quoteShipping(method({ free_over_cents: null }), 99999), { available: true, priceCents: 499 });
});

test('max subtotal makes a locker method unavailable', () => {
  const boxnow = method({ type: 'boxnow', max_subtotal_cents: 20000 });
  assert.equal(quoteShipping(boxnow, 19999).available, true);
  assert.equal(quoteShipping(boxnow, 20000).available, false);
});

test('country list applies to address delivery only', () => {
  const gls = method({ type: 'gls_address', countries: ['HR'] });
  assert.equal(quoteShipping(gls, 1000, 'hr').available, true);
  assert.equal(quoteShipping(gls, 1000, 'SI').available, false);
  assert.equal(quoteShipping(method({ type: 'gls_parcel', countries: ['HR'] }), 1000, 'SI').available, true);
});

test('address vs pickup point per type', () => {
  assert.deepEqual(
    (['delivery', 'pickup', 'gls_address', 'gls_parcel', 'boxnow'] as const).map((t) => [needsAddress(t), needsPickupPoint(t)]),
    [
      [true, false],
      [false, false],
      [true, false],
      [false, true],
      [false, true],
    ],
  );
});
