import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxNowEventDeliversOrder, nextBoxNowShipmentStatus } from './tracking';

test('delivered event marks the shipment delivered', () => {
  assert.equal(nextBoxNowShipmentStatus('delivered', 'labeled'), 'delivered');
  assert.equal(nextBoxNowShipmentStatus('delivered', 'pending'), 'delivered');
});

test('a late older event does not undo delivered', () => {
  assert.equal(nextBoxNowShipmentStatus('in-depot', 'delivered'), 'delivered');
  assert.equal(nextBoxNowShipmentStatus('final-destination', 'delivered'), 'delivered');
});

test('other events keep the existing behaviour', () => {
  assert.equal(nextBoxNowShipmentStatus('new', 'pending'), 'labeled');
  assert.equal(nextBoxNowShipmentStatus('in-depot', 'labeled'), 'labeled');
  assert.equal(nextBoxNowShipmentStatus('canceled', 'labeled'), 'cancelled');
});

test('only delivered moves an open order', () => {
  assert.equal(boxNowEventDeliversOrder('delivered', 'shipped'), true);
  assert.equal(boxNowEventDeliversOrder('delivered', 'processing'), true);
  assert.equal(boxNowEventDeliversOrder('delivered', 'paid'), true);
  assert.equal(boxNowEventDeliversOrder('final-destination', 'shipped'), false);
});

test('an order changed in the admin is left alone', () => {
  assert.equal(boxNowEventDeliversOrder('delivered', 'delivered'), false);
  assert.equal(boxNowEventDeliversOrder('delivered', 'cancelled'), false);
  assert.equal(boxNowEventDeliversOrder('delivered', 'pending'), false);
  assert.equal(boxNowEventDeliversOrder('delivered', null), false);
});
