export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Čeka plaćanje',
  paid: 'Plaćeno',
  processing: 'U obradi',
  shipped: 'Poslano',
  completed: 'Završeno',
  cancelled: 'Otkazano',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Nije plaćeno',
  paid: 'Plaćeno',
  failed: 'Neuspješno',
  refunded: 'Povrat',
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function orderStatusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
}

/** Address snapshot stored on orders (shipping_address / billing_address). */
export type AddressSnapshot = {
  full_name: string;
  company?: string | null;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string | null;
};

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
