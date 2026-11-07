'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db';
import { orders, shipments } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { sendOrderEmail } from '@/lib/email/order-emails';
import { bankReservationDays } from '@/lib/payments/bank-transfer';
import {
  cancelShipment,
  createBoxNowShipment,
  createGlsShipment,
  refreshGlsTracking,
  type ShipmentResult,
} from '@/lib/shipping/shipments';
import { cancelStaleBankTransfers } from '@/lib/shop/order-lifecycle';
import { FULFILMENT_STATUSES, isOrderStatus } from '@/lib/shop/orders';
import { cancelOrderAndRestock, confirmOrderPaid } from '@/lib/shop/payments';

export type ActionState = { error?: string; success?: string } | null;

function refreshOrder(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
}

export async function updateOrderStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const orderId = String(formData.get('order_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!isOrderStatus(status) || !FULFILMENT_STATUSES.includes(status)) return { error: 'Nepoznat status.' };

  const [order] = await getDb()
    .select({ status: orders.status, payment_status: orders.payment_status })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order) return { error: 'Narudžba ne postoji.' };
  if (order.payment_status !== 'paid') {
    return { error: 'Status obrade mijenja se tek kad je narudžba plaćena.' };
  }
  if (order.status === status) return { success: 'Status je već postavljen.' };

  await getDb().update(orders).set({ status }).where(eq(orders.id, orderId));
  if (status === 'shipped') await sendOrderEmail(orderId, 'shipped');
  refreshOrder(orderId);
  return { success: 'Status je ažuriran.' };
}

/** Bank transfer arrived: same idempotent path as card webhooks (stock, e-mail). */
export async function markBankTransferPaid(orderId: string): Promise<ActionState> {
  await requireAdmin();
  const [order] = await getDb()
    .select({ payment_method: orders.payment_method, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order) return { error: 'Narudžba ne postoji.' };
  if (order.payment_method !== 'bank_transfer') {
    return { error: 'Kartična plaćanja potvrđuje pružatelj plaćanja.' };
  }
  if (order.status === 'cancelled') return { error: 'Narudžba je otkazana.' };

  const result = await confirmOrderPaid(orderId);
  refreshOrder(orderId);
  return result === 'already_paid'
    ? { success: 'Narudžba je već označena kao plaćena.' }
    : { success: 'Narudžba je označena kao plaćena.' };
}

export async function cancelOrderAction(orderId: string): Promise<ActionState> {
  await requireAdmin();
  const result = await cancelOrderAndRestock(orderId);
  refreshOrder(orderId);
  if (result === 'not_found') return { error: 'Narudžba ne postoji.' };
  if (typeof result === 'object') return { error: result.error };
  return { success: result === 'already_cancelled' ? 'Narudžba je već otkazana.' : 'Narudžba je otkazana.' };
}

/** Cancels unpaid bank-transfer orders older than BANK_TRANSFER_RESERVATION_DAYS and releases their stock. */
export async function cancelStaleBankTransfersAction(): Promise<ActionState> {
  await requireAdmin();
  const days = bankReservationDays();
  const cancelled = await cancelStaleBankTransfers(getDb(), days);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return {
    success:
      cancelled === 0
        ? `Nema neplaćenih virmana starijih od ${days} dana.`
        : `Otkazano neplaćenih virmana: ${cancelled}.`,
  };
}

function toState(result: ShipmentResult, fallback: string): ActionState {
  return result.ok ? { success: result.message ?? fallback } : { error: result.error };
}

export async function createShipmentAction(orderId: string, provider: 'gls' | 'boxnow'): Promise<ActionState> {
  await requireAdmin();
  const result = provider === 'gls' ? await createGlsShipment(orderId) : await createBoxNowShipment(orderId);
  refreshOrder(orderId);
  return toState(result, 'Pošiljka je kreirana.');
}

export async function cancelShipmentAction(orderId: string, shipmentId: string): Promise<ActionState> {
  await requireAdmin();
  const [shipment] = await getDb()
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.order_id, orderId)));
  if (!shipment) return { error: 'Pošiljka ne pripada ovoj narudžbi.' };
  const result = await cancelShipment(shipmentId);
  refreshOrder(orderId);
  return toState(result, 'Pošiljka je otkazana.');
}

export async function refreshTrackingAction(orderId: string): Promise<ActionState> {
  await requireAdmin();
  const result = await refreshGlsTracking(orderId);
  refreshOrder(orderId);
  return toState(result, 'Praćenje je osvježeno.');
}
