export { boxNowTrackingUrl } from '@/lib/shipping/tracking-urls';

export const BOXNOW_EVENT_LABELS: Record<string, string> = {
  new: 'Čeka se preuzimanje iz trgovine',
  'in-depot': 'Dostavlja se',
  'final-destination': 'Paket je u paketomatu',
  delivered: 'Paket je dostavljen',
  returned: 'Paket je vraćen',
  expired: 'Isteklo je vrijeme preuzimanja',
  canceled: 'Pošiljka je poništena',
  lost: 'Paket se pronalazi',
  missing: 'Paket se pronalazi',
  'accepted-to-locker': 'U procesu isporuke',
  'accepted-for-return': 'U procesu povrata',
};

/** Orders still open in the admin; a manual change in the admin wins over the webhook. */
export const BOXNOW_OPEN_ORDER_STATUSES = ['paid', 'processing', 'shipped'];

/**
 * Shipment status after a BOX NOW webhook event. A delivered shipment stays
 * delivered when an older event arrives late (BOX NOW retries for 24 h).
 */
export function nextBoxNowShipmentStatus(event: string, current: string): string {
  if (event === 'delivered') return 'delivered';
  if (current === 'delivered') return current;
  if (event === 'canceled') return 'cancelled';
  return current === 'pending' ? 'labeled' : current;
}

/** True when this event should move the order to "Dostavljeno". */
export function boxNowEventDeliversOrder(event: string, orderStatus: string | null | undefined): boolean {
  return event === 'delivered' && !!orderStatus && BOXNOW_OPEN_ORDER_STATUSES.includes(orderStatus);
}
