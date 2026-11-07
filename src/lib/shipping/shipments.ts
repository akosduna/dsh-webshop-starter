import 'server-only';

import { and, eq, inArray, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders, shipmentEvents, shipments, storeSettings } from '@/db/schema';
import { BoxNowApiError, cancelBoxNowParcel, createBoxNowDelivery, fetchBoxNowLabel } from '@/lib/boxnow/client';
import { BOXNOW_OPEN_ORDER_STATUSES } from '@/lib/boxnow/tracking';
import { decodeGlsPdf, firstGlsListError, getGlsConfig, glsPost } from '@/lib/gls/client';
import { buildPrintLabelsBody, deliveryAddressForOrder, getGlsSenderAddress } from '@/lib/gls/shipment';
import { extractTrackingRows, findGlsDelivery } from '@/lib/gls/tracking';
import { isModuleReady } from '@/lib/modules';

/**
 * Carrier shipments created from the admin order page. No cron: tracking is
 * refreshed with a button (GLS) or arrives by webhook (BOX NOW).
 */

export type ShipmentResult = { ok: true; message?: string } | { ok: false; error: string };

function orderReference(orderNumber: number) {
  const prefix = (process.env.ORDER_REFERENCE_PREFIX || 'WEB').replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
  return `${prefix}-${orderNumber}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function stripPdf(data: Record<string, unknown>) {
  const copy = { ...data };
  if (copy.Labels) copy.Labels = '[pdf]';
  if (copy.POD) copy.POD = '[pdf]';
  return copy;
}

/** BOX NOW wants +385… numbers. */
export function normalizeBoxNowPhone(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+385${compact.slice(1)}`;
  if (/^9\d{7,8}$/.test(compact)) return `+385${compact}`;
  return `+${compact}`;
}

async function activeShipment(orderId: string, provider: 'gls' | 'boxnow') {
  const [row] = await getDb()
    .select()
    .from(shipments)
    .where(and(eq(shipments.order_id, orderId), eq(shipments.provider, provider), ne(shipments.status, 'cancelled')))
    .limit(1);
  return row ?? null;
}

async function ensurePendingShipment(orderId: string, provider: 'gls' | 'boxnow', pickupPoint: unknown) {
  const existing = await activeShipment(orderId, provider);
  if (existing) return existing;
  const [created] = await getDb()
    .insert(shipments)
    .values({
      order_id: orderId,
      provider,
      status: 'pending',
      pickup_point: (pickupPoint as typeof shipments.$inferInsert.pickup_point) ?? null,
    })
    .returning();
  return created;
}

/** Marks an open order delivered (a manual admin change to another status wins). */
async function markOrderDelivered(orderId: string) {
  await getDb()
    .update(orders)
    .set({ status: 'delivered' })
    .where(and(eq(orders.id, orderId), inArray(orders.status, BOXNOW_OPEN_ORDER_STATUSES as ('paid' | 'processing' | 'shipped')[])));
}

// ---------------------------------------------------------------------------
// GLS
// ---------------------------------------------------------------------------

export async function createGlsShipment(orderId: string): Promise<ShipmentResult> {
  if (!isModuleReady('gls')) return { ok: false, error: 'GLS modul nije spreman (nedostaju ključevi).' };
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { ok: false, error: 'Narudžba nije pronađena.' };
  if (order.shipping_method_type !== 'gls_address' && order.shipping_method_type !== 'gls_parcel') {
    return { ok: false, error: 'Ova narudžba nije GLS dostava.' };
  }
  if (order.payment_status !== 'paid') return { ok: false, error: 'Narudžba još nije plaćena.' };

  const existing = await activeShipment(orderId, 'gls');
  if (existing?.status === 'labeled' || existing?.status === 'delivered') {
    return { ok: true, message: 'Naljepnica već postoji.' };
  }

  const address = order.shipping_address ?? order.billing_address;
  const pickup = order.shipping_method_type === 'gls_parcel' ? order.pickup_point : null;
  if (order.shipping_method_type === 'gls_parcel' && !pickup?.id) {
    return { ok: false, error: 'Nedostaje odabrani GLS paketomat / ParcelShop.' };
  }

  const shipment = await ensurePendingShipment(orderId, 'gls', pickup);

  try {
    const config = getGlsConfig();
    const recipient = deliveryAddressForOrder({
      method: order.shipping_method_type,
      pickup,
      customer: {
        name: address.full_name,
        street: address.street,
        city: address.city,
        postalCode: address.postal_code,
        country: address.country,
        phone: address.phone || order.phone || '',
        email: order.email,
      },
    });
    if (order.shipping_method_type === 'gls_parcel' && (!recipient.City || !recipient.ZipCode)) {
      return { ok: false, error: 'Odabrani paketomat nema potpunu adresu. Kupac treba odabrati drugu lokaciju.' };
    }

    const body = buildPrintLabelsBody({
      clientNumber: config.clientNumber,
      clientReference: orderReference(order.order_number),
      sender: getGlsSenderAddress(),
      recipient,
      content: `Narudzba ${order.order_number}`,
      pickup,
      printerType: process.env.GLS_PRINTER_TYPE,
    });

    const { data, requestForAudit } = await glsPost<
      Record<string, unknown> & {
        Labels?: unknown;
        PrintLabelsInfoList?: Array<{ ParcelId?: number; ParcelNumber?: number }>;
      }
    >('PrintLabels', body);

    const listError = firstGlsListError(data, 'PrintLabelsErrorList');
    if (listError) {
      await db
        .update(shipments)
        .set({ status: 'error', error_message: listError, request_payload: requestForAudit, response_payload: stripPdf(data) })
        .where(eq(shipments.id, shipment.id));
      return { ok: false, error: listError };
    }

    const info = data.PrintLabelsInfoList?.[0];
    if (!info?.ParcelId || !info.ParcelNumber) {
      return { ok: false, error: 'GLS nije vratio broj pošiljke.' };
    }

    await db
      .update(shipments)
      .set({
        status: 'labeled',
        provider_shipment_id: String(info.ParcelId),
        tracking_number: String(info.ParcelNumber),
        label_pdf: decodeGlsPdf(data.Labels),
        request_payload: requestForAudit,
        response_payload: stripPdf(data),
        error_message: null,
      })
      .where(eq(shipments.id, shipment.id));
    return { ok: true, message: `GLS pošiljka ${info.ParcelNumber} je kreirana.` };
  } catch (error) {
    const message = errorMessage(error, 'GLS greška.');
    await db.update(shipments).set({ status: 'error', error_message: message }).where(eq(shipments.id, shipment.id));
    return { ok: false, error: message };
  }
}

/** Downloads the label again from GLS when the stored PDF is missing. */
export async function reprintGlsLabel(shipmentId: string): Promise<Buffer | null> {
  const [shipment] = await getDb().select().from(shipments).where(eq(shipments.id, shipmentId));
  if (!shipment?.provider_shipment_id || shipment.provider !== 'gls') return null;
  const { data } = await glsPost<{ Labels?: unknown }>('GetPrintedLabels', {
    ParcelIdList: [Number(shipment.provider_shipment_id)],
    PrintPosition: 1,
    ShowPrintDialog: false,
    TypeOfPrinter: process.env.GLS_PRINTER_TYPE || 'A4_2x2',
  });
  const pdf = decodeGlsPdf(data.Labels);
  await getDb().update(shipments).set({ label_pdf: pdf }).where(eq(shipments.id, shipmentId));
  return pdf;
}

export async function refreshGlsTracking(orderId: string): Promise<ShipmentResult> {
  const shipment = await activeShipment(orderId, 'gls');
  if (!shipment?.tracking_number) return { ok: false, error: 'Pošiljka još nema broj za praćenje.' };

  let data: Record<string, unknown>;
  try {
    const response = await glsPost<Record<string, unknown>>('GetParcelStatuses', {
      ParcelNumber: Number(shipment.tracking_number),
      ReturnPOD: false,
      LanguageIsoCode: 'HR',
    });
    data = response.data;
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Praćenje nije uspjelo.') };
  }

  const statusErrors = data.GetParcelStatusErrors as unknown[] | undefined;
  if (Array.isArray(statusErrors) && statusErrors.length > 0) {
    return { ok: false, error: 'GLS nije vratio status pošiljke.' };
  }

  const rows = extractTrackingRows(data);
  const latest = rows[rows.length - 1];
  const delivery = findGlsDelivery(data);
  const db = getDb();

  await db
    .update(shipments)
    .set({
      tracking_payload: stripPdf(data),
      provider_status: delivery.delivered ? delivery.text || 'Dostavljeno' : latest?.text || null,
      ...(delivery.delivered ? { status: 'delivered' as const } : {}),
    })
    .where(eq(shipments.id, shipment.id));

  if (latest) {
    await db
      .insert(shipmentEvents)
      .values({
        shipment_id: shipment.id,
        provider_event_id: `gls:${shipment.tracking_number}:${latest.time || 'na'}:${latest.text}`,
        event_type: latest.text,
        payload: { text: latest.text, time: latest.time },
      })
      .onConflictDoNothing();
  }

  if (delivery.delivered) await markOrderDelivered(orderId);
  return { ok: true, message: latest ? `Zadnji status: ${latest.text}` : 'Još nema statusa.' };
}

// ---------------------------------------------------------------------------
// BOX NOW
// ---------------------------------------------------------------------------

export async function createBoxNowShipment(orderId: string): Promise<ShipmentResult> {
  if (!isModuleReady('boxnow')) return { ok: false, error: 'BOX NOW modul nije spreman (nedostaju ključevi).' };
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { ok: false, error: 'Narudžba nije pronađena.' };
  if (order.shipping_method_type !== 'boxnow') return { ok: false, error: 'Ova narudžba nije BOX NOW dostava.' };
  if (order.payment_status !== 'paid') return { ok: false, error: 'Narudžba još nije plaćena.' };
  if (!order.pickup_point?.id) return { ok: false, error: 'Nedostaje odabrani BOX NOW paketomat.' };

  const existing = await activeShipment(orderId, 'boxnow');
  if (existing?.status === 'labeled' || existing?.status === 'delivered') {
    return { ok: true, message: 'Naljepnica već postoji.' };
  }

  const recipientPhone = order.billing_address.phone || order.phone;
  if (!recipientPhone) return { ok: false, error: 'Nedostaje telefon primatelja.' };

  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
  const originPhone = process.env.BOXNOW_CONTACT_PHONE || settings?.contact_phone;
  const originEmail = process.env.BOXNOW_CONTACT_EMAIL || settings?.contact_email;
  if (!originPhone || !originEmail) {
    return { ok: false, error: 'Nedostaje telefon ili e-mail pošiljatelja (Postavke ili BOXNOW_CONTACT_*).' };
  }

  const shipment = await ensurePendingShipment(orderId, 'boxnow', order.pickup_point);

  try {
    const created = await createBoxNowDelivery({
      orderNumber: orderReference(order.order_number),
      invoiceValue: (order.subtotal_cents / 100).toFixed(2),
      originName: settings?.shop_name || 'Trgovina',
      originPhone: normalizeBoxNowPhone(originPhone),
      originEmail,
      destinationName: order.billing_address.full_name,
      destinationPhone: normalizeBoxNowPhone(recipientPhone),
      destinationEmail: order.email,
      lockerId: String(order.pickup_point.id),
      itemName: `Narudžba ${order.order_number}`,
    });
    const pdf = await fetchBoxNowLabel(created.parcelId);
    await db
      .update(shipments)
      .set({
        status: 'labeled',
        provider_shipment_id: created.parcelId,
        tracking_number: created.parcelId,
        provider_status: 'Čeka se preuzimanje iz trgovine',
        label_pdf: pdf,
        request_payload: created.requestBody,
        response_payload: created.responseBody,
        error_message: null,
      })
      .where(eq(shipments.id, shipment.id));
    return { ok: true, message: `BOX NOW pošiljka ${created.parcelId} je kreirana.` };
  } catch (error) {
    const message = errorMessage(error, 'BOX NOW greška.');
    await db
      .update(shipments)
      .set({
        status: 'error',
        error_message: message,
        ...(error instanceof BoxNowApiError
          ? { request_payload: error.requestBody ?? null, response_payload: error.responseBody ?? null }
          : {}),
      })
      .where(eq(shipments.id, shipment.id));
    return { ok: false, error: message };
  }
}

export async function cancelShipment(shipmentId: string): Promise<ShipmentResult> {
  const db = getDb();
  const [shipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId));
  if (!shipment || shipment.status === 'cancelled') return { ok: false, error: 'Nema aktivne pošiljke.' };
  if (shipment.status === 'delivered') return { ok: false, error: 'Dostavljena pošiljka se ne može otkazati.' };

  if (shipment.provider_shipment_id) {
    try {
      if (shipment.provider === 'gls') {
        const { data } = await glsPost<Record<string, unknown>>('DeleteLabels', {
          ParcelIdList: [Number(shipment.provider_shipment_id)],
        });
        const listError = firstGlsListError(data, 'DeleteLabelsErrorList');
        if (listError) return { ok: false, error: listError };
      } else {
        await cancelBoxNowParcel(shipment.provider_shipment_id);
      }
    } catch (error) {
      return { ok: false, error: errorMessage(error, 'Otkazivanje nije uspjelo.') };
    }
  }

  await db.update(shipments).set({ status: 'cancelled' }).where(eq(shipments.id, shipmentId));
  return { ok: true, message: 'Pošiljka je otkazana.' };
}

export { markOrderDelivered };
