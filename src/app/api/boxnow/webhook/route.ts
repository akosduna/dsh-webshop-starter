import { and, eq, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, shipmentEvents, shipments } from '@/db/schema';
import { BOXNOW_EVENT_LABELS, boxNowEventDeliversOrder, nextBoxNowShipmentStatus } from '@/lib/boxnow/tracking';
import { verifyBoxNowSignature } from '@/lib/boxnow/webhook-signature';
import { envValue } from '@/lib/env';
import { markOrderDelivered } from '@/lib/shipping/shipments';

export const runtime = 'nodejs';

type BoxNowWebhook = {
  id?: string;
  time?: string;
  datasignature?: string;
  data?: {
    parcelId?: string;
    parcelState?: string;
    orderNumber?: string;
    event?: string;
    time?: string;
    eventLocation?: { displayName?: string; postalCode?: string };
    additionalInformation?: string;
  };
};

function parseTime(value: string | undefined): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function POST(request: Request) {
  const secret = envValue('BOXNOW_WEBHOOK_SECRET');
  if (!secret) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const raw = await request.text();
  let payload: BoxNowWebhook;
  try {
    payload = JSON.parse(raw) as BoxNowWebhook;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!verifyBoxNowSignature(secret, raw, payload)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const event = payload.data?.event || payload.data?.parcelState || 'unknown';
  const parcelId = payload.data?.parcelId ? String(payload.data.parcelId) : null;
  const orderNumber = payload.data?.orderNumber || null;
  const db = getDb();

  let shipment: { id: string; status: string; order_id: string } | null = null;
  if (parcelId) {
    [shipment = null] = await db
      .select({ id: shipments.id, status: shipments.status, order_id: shipments.order_id })
      .from(shipments)
      .where(and(eq(shipments.provider, 'boxnow'), eq(shipments.provider_shipment_id, parcelId)))
      .limit(1);
  }
  if (!shipment && orderNumber) {
    const match = orderNumber.match(/(\d+)\s*$/);
    if (match) {
      [shipment = null] = await db
        .select({ id: shipments.id, status: shipments.status, order_id: shipments.order_id })
        .from(shipments)
        .innerJoin(orders, eq(orders.id, shipments.order_id))
        .where(
          and(
            eq(orders.order_number, Number(match[1])),
            eq(shipments.provider, 'boxnow'),
            ne(shipments.status, 'cancelled'),
          ),
        )
        .limit(1);
    }
  }

  if (!shipment) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const eventTime = parseTime(payload.data?.time || payload.time);
    await db
      .insert(shipmentEvents)
      .values({
        shipment_id: shipment.id,
        provider_event_id: payload.id || `boxnow:${parcelId || orderNumber}:${eventTime.toISOString()}:${event}`,
        event_type: event,
        event_time: eventTime,
        payload,
      })
      .onConflictDoNothing();

    await db
      .update(shipments)
      .set({
        status: nextBoxNowShipmentStatus(event, shipment.status) as typeof shipments.$inferSelect.status,
        provider_status: BOXNOW_EVENT_LABELS[event] || event,
        tracking_payload: payload.data || payload,
        ...(parcelId ? { provider_shipment_id: parcelId, tracking_number: parcelId } : {}),
      })
      .where(eq(shipments.id, shipment.id));

    if (event === 'delivered') {
      const [order] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, shipment.order_id));
      if (boxNowEventDeliversOrder(event, order?.status)) {
        await markOrderDelivered(shipment.order_id);
      }
    }
  } catch (error) {
    console.error('[boxnow-webhook] update failed:', error);
    // Non-200 makes BOX NOW retry (5 min, 10 min, 1 h, 2 h).
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
