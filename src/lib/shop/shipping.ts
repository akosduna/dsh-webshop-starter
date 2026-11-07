import type { Tables } from '@/types/database';

export type ShippingMethod = Pick<
  Tables<'shipping_methods'>,
  'id' | 'name' | 'description' | 'type' | 'price_cents' | 'free_over_cents'
>;

/** Shipping cost for a cart subtotal. Shared by checkout UI and server. */
export function shippingCostCents(method: ShippingMethod, subtotalCents: number): number {
  if (method.free_over_cents !== null && subtotalCents >= method.free_over_cents) return 0;
  return method.price_cents;
}
