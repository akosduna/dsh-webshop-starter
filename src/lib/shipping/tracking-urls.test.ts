import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxNowTrackingUrl, glsTrackingUrl, trackingUrlFor } from './tracking-urls';

test('GLS and BOX NOW tracking links', () => {
  assert.equal(glsTrackingUrl('12345678'), 'https://gls-group.com/HR/hr/pracenje-posiljke/?match=12345678');
  assert.equal(boxNowTrackingUrl('9219999999'), 'https://www.boxnow.hr/track?parcelId=9219999999');
  assert.equal(trackingUrlFor('boxnow', '1'), boxNowTrackingUrl('1'));
  assert.equal(trackingUrlFor('gls', '1'), glsTrackingUrl('1'));
});

test('tracking numbers are URL-encoded', () => {
  assert.equal(glsTrackingUrl('a b&c'), 'https://gls-group.com/HR/hr/pracenje-posiljke/?match=a%20b%26c');
});
