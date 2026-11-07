import type { ModuleId } from '@/config/modules';
import type { ShippingMethodRow, ShippingMethodType } from '@/db/schema';

export type ShippingMethod = Pick<
  ShippingMethodRow,
  | 'id'
  | 'name'
  | 'description'
  | 'type'
  | 'price_cents'
  | 'free_over_cents'
  | 'max_subtotal_cents'
  | 'countries'
>;

/** Which module a shipping method type belongs to. */
export const SHIPPING_TYPE_MODULE: Record<ShippingMethodType, ModuleId> = {
  delivery: 'flat_rate_delivery',
  pickup: 'store_pickup',
  gls_address: 'gls',
  gls_parcel: 'gls',
  boxnow: 'boxnow',
};

/** Types that need a delivery address. */
export function needsAddress(type: ShippingMethodType): boolean {
  return type === 'delivery' || type === 'gls_address';
}

/** Types that need a pickup point (parcel locker / ParcelShop). */
export function needsPickupPoint(type: ShippingMethodType): boolean {
  return type === 'gls_parcel' || type === 'boxnow';
}

/** Shipping cost for a cart subtotal. Shared by checkout UI and server. */
export function shippingCostCents(method: ShippingMethod, subtotalCents: number): number {
  if (method.free_over_cents !== null && subtotalCents >= method.free_over_cents) return 0;
  return method.price_cents;
}

export type ShippingQuote =
  | { available: true; priceCents: number }
  | { available: false; reason: string };

/** Price and availability of one method for a cart (and a destination country, when known). */
export function quoteShipping(
  method: ShippingMethod,
  subtotalCents: number,
  country?: string,
): ShippingQuote {
  if (method.max_subtotal_cents !== null && subtotalCents >= method.max_subtotal_cents) {
    return { available: false, reason: 'Iznos narudžbe je prevelik za ovaj način dostave.' };
  }
  if (
    country &&
    needsAddress(method.type) &&
    method.countries?.length &&
    !method.countries.includes(country.toUpperCase())
  ) {
    return { available: false, reason: 'Dostava u odabranu državu nije dostupna ovim načinom.' };
  }
  return { available: true, priceCents: shippingCostCents(method, subtotalCents) };
}

/** Keeps only the methods whose module is ready (see src/config/modules.ts). */
export function filterReadyShippingMethods<T extends Pick<ShippingMethod, 'type'>>(
  methods: T[],
  isReady: (id: ModuleId) => boolean,
): T[] {
  return methods.filter((m) => isReady(SHIPPING_TYPE_MODULE[m.type]));
}
