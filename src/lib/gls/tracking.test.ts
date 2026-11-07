import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGlsDelivery } from './tracking';

test('in-transit parcel is not delivered', () => {
  const result = findGlsDelivery({
    ParcelStatusList: [
      { StatusCode: '51', StatusDate: '/Date(1760000000000+0200)/' },
      { StatusCode: '01', StatusDate: '/Date(1760003600000+0200)/' },
      { StatusCode: '04', StatusDate: '/Date(1760007200000+0200)/' },
    ],
  });
  assert.equal(result.delivered, false);
});

test('code 05 marks the parcel delivered with its time', () => {
  const result = findGlsDelivery({
    ParcelStatusList: [
      { StatusCode: '05', StatusDate: '/Date(1760010800000+0200)/', StatusDescription: 'Isporučeno' },
      { StatusCode: '04', StatusDate: '/Date(1760007200000+0200)/' },
    ],
  });
  assert.equal(result.delivered, true);
  assert.equal(result.code, 5);
  assert.equal(result.time, new Date(1760010800000).toISOString());
  assert.equal(result.text, 'Isporučeno');
});

test('parcel left in a locker or ParcelShop (54 / 55) is not yet delivered', () => {
  assert.equal(findGlsDelivery({ ParcelStatusList: [{ StatusCode: '54' }] }).delivered, false);
  assert.equal(findGlsDelivery({ ParcelStatusList: [{ StatusCode: '55' }] }).delivered, false);
});

test('neighbour (58) and 92 count as delivered', () => {
  assert.equal(findGlsDelivery({ ParcelStatusList: [{ StatusCode: '58' }] }).delivered, true);
  assert.equal(findGlsDelivery({ ParcelStatusList: [{ StatusCode: 92 }] }).delivered, true);
});

test('garbage input is not delivered', () => {
  assert.equal(findGlsDelivery(null).delivered, false);
  assert.equal(findGlsDelivery({}).delivered, false);
});
