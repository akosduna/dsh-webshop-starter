import 'server-only';

import bwipjs from 'bwip-js/node';
import { envValue } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { formatHub3Data, type BankDetails, type Hub3Payment } from './hub3';

/** Recipient data for the payment slip, or null when the module is not ready. */
export function getBankDetails(): BankDetails | null {
  if (!isModuleReady('bank_transfer')) return null;
  return {
    iban: envValue('BANK_IBAN')!,
    recipientName: envValue('BANK_RECIPIENT_NAME')!,
    recipientStreet: envValue('BANK_RECIPIENT_STREET')!,
    recipientCity: envValue('BANK_RECIPIENT_CITY')!,
    model: envValue('BANK_PAYMENT_MODEL') ?? 'HR00',
  };
}

export function bankReferenceTemplate(): string | undefined {
  return envValue('BANK_REFERENCE_TEMPLATE');
}

/** Days an unpaid bank-transfer order keeps its stock reservation (admin cancels after that). */
export function bankReservationDays(): number {
  const days = Number(process.env.BANK_TRANSFER_RESERVATION_DAYS);
  return Number.isInteger(days) && days > 0 ? days : 7;
}

export async function renderHub3Barcode(bank: BankDetails, payment: Hub3Payment): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'pdf417',
    text: formatHub3Data(bank, payment),
    scale: 3,
    height: 14,
    includetext: false,
  });
}
