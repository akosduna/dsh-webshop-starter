import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bankPaymentDescription,
  buildPaymentReference,
  formatHub3Amount,
  formatHub3Data,
  formatIban,
  toHub3Ascii,
  type BankDetails,
} from './hub3';

const bank: BankDetails = {
  iban: 'HR12 1001 0051 8630 0016 0',
  recipientName: 'Moja trgovina d.o.o.',
  recipientStreet: 'Ulica primjera 1',
  recipientCity: '10000 Zagreb',
  model: 'HR00',
};

test('HUB-3 payload matches the known-good 16-line layout', () => {
  const data = formatHub3Data(bank, {
    amountCents: 2499,
    reference: '0-2026-1001',
    description: bankPaymentDescription(1001),
  });
  const expected = [
    'HRVHUB30',
    'EUR',
    '000000000002499',
    '',
    '',
    '',
    'Moja trgovina d.o.o.',
    'Ulica primjera 1',
    '10000 Zagreb',
    'HR1210010051863000160',
    'HR00',
    '0-2026-1001',
    '',
    'Narudzba #1001',
    '',
    '',
  ].join('\n');
  assert.equal(data, expected);
  assert.equal(data.split('\n').length, 16);
});

test('fields are cut to the HUB-3 maximum length', () => {
  const data = formatHub3Data(
    { ...bank, recipientName: 'A'.repeat(40), recipientStreet: 'B'.repeat(40), recipientCity: 'C'.repeat(40) },
    { amountCents: 1, reference: '9'.repeat(30), description: 'D'.repeat(50) },
  );
  const lines = data.split('\n');
  assert.equal(lines[6].length, 25);
  assert.equal(lines[7].length, 25);
  assert.equal(lines[8].length, 27);
  assert.equal(lines[11].length, 22);
  assert.equal(lines[13].length, 35);
});

test('amount is 15 digits in cents and rejects bad values', () => {
  assert.equal(formatHub3Amount(0), '000000000000000');
  assert.equal(formatHub3Amount(123456), '000000000123456');
  assert.throws(() => formatHub3Amount(-1));
  assert.throws(() => formatHub3Amount(12.5));
});

test('ASCII conversion strips diacritics and non-ASCII', () => {
  assert.equal(toHub3Ascii('Ivana Čačić-Žužić'), 'Ivana Cacic-Zuzic');
  assert.equal(toHub3Ascii('Đurđa Šimić  Ćorić'), 'Durda Simic Coric');
  assert.equal(toHub3Ascii('Müller 😀'), 'Muller');
});

test('payment reference uses the order year and number', () => {
  const createdAt = new Date('2026-03-04T10:00:00Z');
  assert.equal(buildPaymentReference(undefined, 1001, createdAt), '0-2026-1001');
  assert.equal(buildPaymentReference('{orderNumber}-{year}', 1001, createdAt), '1001-2026');
});

test('IBAN is printed in groups of four', () => {
  assert.equal(formatIban('hr1210010051863000160'), 'HR12 1001 0051 8630 0016 0');
});
