import 'server-only';

import { isModuleReady } from '@/lib/modules';
import { getActiveShippingMethods } from './catalog';
import type { PaymentOption } from './checkout-types';
import { filterReadyShippingMethods, type ShippingMethod } from './shipping';

/** Payment methods whose module is ready, in display order. */
export function getPaymentOptions(): PaymentOption[] {
  const options: PaymentOption[] = [];
  if (isModuleReady('stripe')) {
    options.push({ id: 'stripe', label: 'Kartično plaćanje', description: 'Kartice, Apple Pay i Google Pay (Stripe).' });
  }
  if (isModuleReady('teya')) {
    options.push({ id: 'teya', label: 'Kartično plaćanje (Teya)', description: 'Plaćanje na sigurnoj stranici Teye.' });
  }
  if (isModuleReady('bank_transfer')) {
    options.push({
      id: 'bank_transfer',
      label: 'Uplata na račun',
      description: 'Dobit ćete podatke za uplatu i barkod za mobilno bankarstvo. Šaljemo nakon uplate.',
    });
  }
  return options;
}

/** Active shipping methods whose module is ready (GLS / BOX NOW need their keys). */
export async function getCheckoutShippingMethods(): Promise<ShippingMethod[]> {
  return filterReadyShippingMethods(await getActiveShippingMethods(), (id) => isModuleReady(id));
}
