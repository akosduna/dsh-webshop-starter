/**
 * HUB-3 payment slip data for the PDF417 barcode that Croatian banking apps
 * scan ("slikaj i plati").
 *
 * 16 lines. Payer lines (4–6) stay empty: the payer's banking app fills them.
 * Line 14 is the payment description shown in the app, the same text the
 * order page shows. Every field is converted to ASCII (č→c, ž→z …) and cut
 * to the HUB-3 maximum length; the amount is in cents, zero-padded to 15
 * digits.
 *
 * Merchant data comes only from env (BANK_*), never from code.
 */

export type BankDetails = {
  iban: string;
  recipientName: string;
  recipientStreet: string;
  /** Postal code and city, e.g. "10000 Zagreb". */
  recipientCity: string;
  /** Payment model, default HR00. */
  model: string;
};

export type Hub3Payment = {
  amountCents: number;
  currency?: string;
  reference: string;
  description: string;
};

/** Payment description for an order, on the order page and in the barcode. */
export function bankPaymentDescription(orderNumber: number): string {
  return `Narudžba #${orderNumber}`;
}

const CROATIAN_MAP: Record<string, string> = {
  č: 'c',
  ć: 'c',
  đ: 'd',
  š: 's',
  ž: 'z',
  Č: 'C',
  Ć: 'C',
  Đ: 'D',
  Š: 'S',
  Ž: 'Z',
};

/** Croatian letters → ASCII, other accents stripped, anything else non-ASCII removed. */
export function toHub3Ascii(value: string): string {
  return value
    .replace(/[čćđšžČĆĐŠŽ]/g, (c) => CROATIAN_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function field(value: string, maxLength: number): string {
  return toHub3Ascii(value).slice(0, maxLength);
}

export function formatHub3Amount(amountCents: number): string {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error('HUB-3 amount must be a non-negative integer number of cents');
  }
  return String(amountCents).padStart(15, '0');
}

export function formatHub3Data(bank: BankDetails, payment: Hub3Payment): string {
  return [
    'HRVHUB30', // 1. header
    (payment.currency ?? 'EUR').toUpperCase(), // 2. currency
    formatHub3Amount(payment.amountCents), // 3. amount in cents, 15 digits
    '', // 4. payer name (filled by the payer's app)
    '', // 5. payer street
    '', // 6. payer city
    field(bank.recipientName, 25), // 7. recipient name
    field(bank.recipientStreet, 25), // 8. recipient street
    field(bank.recipientCity, 27), // 9. recipient postal code + city
    bank.iban.replace(/\s+/g, '').toUpperCase().slice(0, 21), // 10. IBAN
    field(bank.model, 4), // 11. model, e.g. HR00
    field(payment.reference, 22), // 12. reference ("poziv na broj")
    '', // 13. purpose code (empty)
    field(payment.description, 35), // 14. payment description
    '', // 15. reserved
    '', // 16. reserved
  ].join('\n');
}

/**
 * Reference ("poziv na broj") for an order. Template placeholders:
 * {year} = year the order was created, {orderNumber}. Default 0-{year}-{orderNumber}.
 */
export function buildPaymentReference(
  template: string | undefined,
  orderNumber: number,
  createdAt: Date,
): string {
  const tpl = template?.trim() || '0-{year}-{orderNumber}';
  return tpl
    .replaceAll('{year}', String(createdAt.getFullYear()))
    .replaceAll('{orderNumber}', String(orderNumber));
}

export function formatIban(iban: string): string {
  return iban
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}
