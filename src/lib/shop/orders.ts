import {
  ORDER_STATUSES,
  type AddressSnapshot,
  type OrderStatus,
  type PaymentMethod,
  type PickupPoint,
  type ShippingMethodType,
} from '@/db/enums';

export { ORDER_STATUSES, type OrderStatus, type AddressSnapshot, type PickupPoint };

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Čeka uplatu',
  paid: 'Plaćeno',
  processing: 'U obradi',
  shipped: 'Poslano',
  delivered: 'Dostavljeno',
  completed: 'Završeno',
  cancelled: 'Otkazano',
};

/** Statuses an admin can set from the status dropdown (payment has its own buttons). */
export const FULFILMENT_STATUSES: OrderStatus[] = [
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
];

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Nije plaćeno',
  paid: 'Plaćeno',
  failed: 'Neuspješno',
  refunded: 'Povrat',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Uplata na račun (virman)',
  stripe: 'Kartica (Stripe)',
  teya: 'Kartica (Teya)',
};

export const SHIPPING_TYPE_LABELS: Record<ShippingMethodType, string> = {
  delivery: 'Dostava na adresu',
  pickup: 'Osobno preuzimanje',
  gls_address: 'GLS dostava na adresu',
  gls_parcel: 'GLS paketomat / ParcelShop',
  boxnow: 'BOX NOW paketomat',
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function orderStatusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

export function pickupPointLine(point: PickupPoint | null | undefined): string | null {
  if (!point) return null;
  const address = [point.contact?.address, [point.contact?.postalCode, point.contact?.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [point.name || point.id, address].filter(Boolean).join(' — ');
}

export function parseAddressSnapshot(value: unknown): AddressSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  if (!str('full_name') || !str('street')) return null;
  return {
    full_name: str('full_name'),
    company: str('company') || null,
    street: str('street'),
    city: str('city'),
    postal_code: str('postal_code'),
    country: str('country') || 'HR',
    phone: str('phone') || null,
  };
}
