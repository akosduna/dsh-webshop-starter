import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyBoxNowSignature } from './webhook-signature';

// HMAC-SHA256 of JSON.stringify(data) with the secret below, computed with openssl.
const SECRET = 'boxnow-fixture-secret';
const data = { parcelId: '9219999999', event: 'delivered' };
const HEX = '0e2d49721a45fffc5e76813f7114e26cfd32b5aa9cb55293d26ed3af934d23ea';
const BASE64 = 'Di1JchpF//xedoE/cRTibP0ytaqctVKT0m7Tr5NNI+o=';

test('hex and base64 signatures over the data object are accepted', () => {
  for (const datasignature of [HEX, BASE64]) {
    const payload = { data, datasignature };
    assert.equal(verifyBoxNowSignature(SECRET, JSON.stringify(payload), payload), true);
  }
});

test('signature over the raw body is accepted', () => {
  const raw = JSON.stringify(data);
  assert.equal(verifyBoxNowSignature(SECRET, raw, { datasignature: HEX }), true);
});

test('wrong secret, tampered data or a missing signature are rejected', () => {
  const payload = { data, datasignature: HEX };
  assert.equal(verifyBoxNowSignature('other', JSON.stringify(payload), payload), false);
  const tampered = { data: { ...data, event: 'canceled' }, datasignature: HEX };
  assert.equal(verifyBoxNowSignature(SECRET, JSON.stringify(tampered), tampered), false);
  assert.equal(verifyBoxNowSignature(SECRET, '{}', { data }), false);
});
