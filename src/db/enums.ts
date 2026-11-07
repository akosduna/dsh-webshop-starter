// Plain constants shared by the schema and client components (no Drizzle import,
// so client bundles stay small).

export const SHIPPING_METHOD_TYPES = ['delivery', 'pickup', 'gls_address', 'gls_parcel', 'boxnow'] as const;
export type ShippingMethodType = (typeof SHIPPING_METHOD_TYPES)[number];

export const ORDER_STATUSES = [
  'awaiting_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['bank_transfer', 'stripe', 'teya'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_EMAIL_KINDS = ['received', 'bank_transfer', 'paid', 'shipped'] as const;
export type OrderEmailKind = (typeof ORDER_EMAIL_KINDS)[number];

export type AddressSnapshot = {
  full_name: string;
  company?: string | null;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string | null;
};

/** GLS ParcelShop / parcel locker or BOX NOW locker chosen at checkout. */
export type PickupPoint = {
  id: string;
  name?: string;
  type?: string;
  contact?: { address?: string; city?: string; postalCode?: string; countryCode?: string };
};
