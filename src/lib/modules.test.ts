import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modules } from '@/config/modules';
import { evaluateModule, getAllModuleStatuses, isModuleReady } from './modules';
import { filterReadyShippingMethods } from './shop/shipping';

const bankEnv = {
  BANK_IBAN: 'HR1210010051863000160',
  BANK_RECIPIENT_NAME: 'Moja trgovina d.o.o.',
  BANK_RECIPIENT_STREET: 'Ulica primjera 1',
  BANK_RECIPIENT_CITY: '10000 Zagreb',
};

test('defaults: on/off as agreed', () => {
  const on = Object.values(modules).filter((m) => m.enabled).map((m) => m.id).sort();
  assert.deepEqual(on, [
    'bank_transfer',
    'blob_uploads',
    'blog',
    'boxnow',
    'flat_rate_delivery',
    'gls',
    'store_pickup',
    'stripe',
  ]);
  assert.equal(modules.teya.enabled, false);
  assert.equal(modules.order_emails.enabled, false);
});

test('enabled module with all keys is ready', () => {
  assert.equal(isModuleReady('bank_transfer', bankEnv), true);
});

test('missing and placeholder keys are listed', () => {
  const status = evaluateModule(modules.bank_transfer, { ...bankEnv, BANK_IBAN: 'REPLACE_ME', BANK_RECIPIENT_CITY: ' ' });
  assert.equal(status.state, 'missing_keys');
  assert.deepEqual(status.missingEnv, ['BANK_IBAN', 'BANK_RECIPIENT_CITY']);
});

test('disabled wins over keys', () => {
  const status = evaluateModule({ ...modules.stripe, enabled: false }, {
    STRIPE_SECRET_KEY: 'x',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'y',
    STRIPE_WEBHOOK_SECRET: 'z',
  });
  assert.equal(status.state, 'disabled');
});

test('modules without keys are ready with an empty env', () => {
  const ready = getAllModuleStatuses({}).filter((s) => s.state === 'ready').map((s) => s.id).sort();
  assert.deepEqual(ready, ['blog', 'flat_rate_delivery', 'store_pickup']);
});

test('checkout hides shipping methods whose module is not ready', () => {
  const methods = [
    { type: 'delivery' as const },
    { type: 'pickup' as const },
    { type: 'gls_address' as const },
    { type: 'gls_parcel' as const },
    { type: 'boxnow' as const },
  ];
  const visible = filterReadyShippingMethods(methods, (id) => isModuleReady(id, {}));
  assert.deepEqual(visible.map((m) => m.type), ['delivery', 'pickup']);
});
