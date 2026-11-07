import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaymentParams,
  createCheckHash,
  getTeyaConfig,
  parseTeyaAmount,
  readTeyaCallback,
  sanitizeReturnBase,
  toTeyaOrderId,
  verifyOrderHash,
} from './teya';

// Fixture hashes were computed with `openssl dgst -sha256 -hmac <secret>`, not with this code.
const SECRET = 'fixture-secret-99887766';
const CHECKHASH = 'fa2688fdf75e966d66fd672fd9f376b1b6e61d5204ece5d8df55d1aebcc3fed6';
const ORDERHASH = '0294e26e7ac066161c523926e643a7e4bf9efbff6a426c5e16258de6dc3d26fa';

const env = {
  TEYA_MERCHANT_ID: '9256684',
  TEYA_PAYMENT_GATEWAY_ID: '16',
  TEYA_SECRET_KEY: SECRET,
  TEYA_API_URL: 'https://test.borgun.is/SecurePay/default.aspx',
  NEXT_PUBLIC_APP_URL: 'https://shop.example.com/',
};

test('checkhash matches the fixture', () => {
  assert.equal(
    createCheckHash({
      secretKey: SECRET,
      merchantId: '9256684',
      returnUrlSuccess: 'https://shop.example.com/api/teya/success',
      returnUrlSuccessServer: 'https://shop.example.com/api/teya/notify',
      orderId: 'WS0000001001',
      amount: '24.99',
      currency: 'EUR',
    }),
    CHECKHASH,
  );
});

test('payment form is signed with the fixture hash and has an item line', () => {
  const config = getTeyaConfig(env);
  const { actionUrl, fields } = buildPaymentParams(config, {
    orderId: toTeyaOrderId(1001, config.orderPrefix),
    amountCents: 2499,
    cartItems: [],
  });
  assert.equal(actionUrl, env.TEYA_API_URL);
  assert.equal(fields.orderid, 'WS0000001001');
  assert.equal(fields.amount, '24.99');
  assert.equal(fields.checkhash, CHECKHASH);
  assert.equal(fields.returnurlsuccessserver, 'https://shop.example.com/api/teya/notify');
  assert.equal(fields.itemamount_0, '24.99');
});

test('orderhash verification accepts the fixture and rejects tampering', () => {
  const base = { secretKey: SECRET, orderId: 'WS0000001001', amount: '24.99', currency: 'EUR' };
  assert.equal(verifyOrderHash({ ...base, orderHash: ORDERHASH }), true);
  assert.equal(verifyOrderHash({ ...base, orderHash: ORDERHASH.toUpperCase() }), true);
  assert.equal(verifyOrderHash({ ...base, amount: '0.01', orderHash: ORDERHASH }), false);
  assert.equal(verifyOrderHash({ ...base, orderHash: '' }), false);
  assert.equal(verifyOrderHash({ ...base, orderHash: 'not-hex' }), false);
});

test('missing keys throw', () => {
  assert.throws(() => getTeyaConfig({ ...env, TEYA_SECRET_KEY: '' }));
});

test('helpers: order id, amounts, loopback return URLs, callback field variants', () => {
  assert.equal(toTeyaOrderId(42), 'WS0000000042');
  assert.equal(parseTeyaAmount('24,99'), 2499);
  assert.equal(parseTeyaAmount('350'), 35000);
  assert.equal(parseTeyaAmount('1.234'), null);
  assert.equal(sanitizeReturnBase('http://localhost:3105/'), 'http://lvh.me:3105');
  const cb = readTeyaCallback({ OrderId: 'WS1', Amount: '1.00', OrderHash: 'ab', Status: 'OK' }, 'EUR');
  assert.deepEqual([cb.orderId, cb.amount, cb.currency, cb.orderHash, cb.status], ['WS1', '1.00', 'EUR', 'ab', 'ok']);
});
