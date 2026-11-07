'use server';

import { and, count, eq, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { addresses, orderItems, orders, products, shippingMethods, type AddressSnapshot, type PickupPoint } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { sendOrderEmail } from '@/lib/email/order-emails';
import { isModuleReady } from '@/lib/modules';
import { bankReferenceTemplate } from '@/lib/payments/bank-transfer';
import { buildPaymentReference } from '@/lib/payments/hub3';
import { teyaParamsForOrder } from '@/lib/payments/teya-orders';
import { getPaymentOptions } from '@/lib/shop/checkout-options';
import {
  generateAccessToken,
  ORDER_ACCESS_COOKIE_MAX_AGE,
  orderAccessCookieName,
} from '@/lib/shop/order-access';
import { OutOfStockError, reserveStock } from '@/lib/shop/order-lifecycle';
import { loadViewableOrder } from '@/lib/shop/order-viewer';
import { needsAddress, needsPickupPoint, quoteShipping, SHIPPING_TYPE_MODULE } from '@/lib/shop/shipping';
import { getStripe } from '@/lib/stripe/server';
import type { AddressInput, CheckoutInput, CheckoutResult, TeyaRedirect } from '@/lib/shop/checkout-types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

function clean(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validateAddress(prefix: string, address: AddressInput, errors: Record<string, string>): AddressSnapshot {
  const snapshot: AddressSnapshot = {
    full_name: clean(address?.full_name),
    company: clean(address?.company) || null,
    street: clean(address?.street),
    city: clean(address?.city, 100),
    postal_code: clean(address?.postal_code, 20),
    country: clean(address?.country, 2).toUpperCase() || 'HR',
    phone: clean(address?.phone, 40) || null,
  };
  if (!snapshot.full_name) errors[`${prefix}.full_name`] = 'Upišite ime i prezime.';
  if (!snapshot.street) errors[`${prefix}.street`] = 'Upišite ulicu i kućni broj.';
  if (!snapshot.city) errors[`${prefix}.city`] = 'Upišite grad.';
  if (!snapshot.postal_code) errors[`${prefix}.postal_code`] = 'Upišite poštanski broj.';
  return snapshot;
}

function cleanPickupPoint(value: PickupPoint | null | undefined): PickupPoint | null {
  if (!value || typeof value !== 'object') return null;
  const id = clean(value.id, 80);
  if (!id) return null;
  return {
    id,
    name: clean(value.name, 200) || undefined,
    type: clean(value.type, 40) || undefined,
    contact: {
      address: clean(value.contact?.address, 200) || undefined,
      city: clean(value.contact?.city, 100) || undefined,
      postalCode: clean(value.contact?.postalCode, 20) || undefined,
      countryCode: clean(value.contact?.countryCode, 2).toUpperCase() || undefined,
    },
  };
}

async function setOrderAccessCookie(orderId: string, token: string) {
  (await cookies()).set(orderAccessCookieName(orderId), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ORDER_ACCESS_COOKIE_MAX_AGE,
  });
}

/**
 * Creates an order from the cart. Prices, stock and shipping are recalculated
 * from the database: the browser only sends product ids and quantities.
 * Bank transfer reserves stock now; card payments take it when paid.
 */
export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const db = getDb();

  // ---- 1. Validate the form --------------------------------------------------
  const errors: Record<string, string> = {};
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone, 40);
  if (!EMAIL_RE.test(email)) errors.email = 'Upišite ispravnu e-mail adresu.';
  if (!phone) errors.phone = 'Upišite broj telefona.';
  if (!input.acceptTerms) errors.acceptTerms = 'Potrebno je prihvatiti uvjete kupnje.';

  const paymentOptions = getPaymentOptions();
  const paymentMethod = paymentOptions.find((o) => o.id === input.paymentMethod)?.id;
  if (paymentOptions.length === 0) {
    return { ok: false, error: 'Trgovina još nema postavljen nijedan način plaćanja.' };
  }
  if (!paymentMethod) errors.paymentMethod = 'Odaberite način plaćanja.';

  const items = (Array.isArray(input.items) ? input.items : [])
    .slice(0, MAX_ITEMS)
    .filter(
      (i) =>
        UUID_RE.test(i.productId) &&
        (i.variantId === null || UUID_RE.test(i.variantId)) &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= MAX_QUANTITY,
    );
  if (items.length === 0) return { ok: false, error: 'Košarica je prazna.' };

  const [method] = UUID_RE.test(input.shippingMethodId ?? '')
    ? await db
        .select()
        .from(shippingMethods)
        .where(and(eq(shippingMethods.id, input.shippingMethodId), eq(shippingMethods.is_active, true)))
    : [];
  if (!method || !isModuleReady(SHIPPING_TYPE_MODULE[method.type])) {
    errors.shippingMethodId = 'Odaberite način dostave.';
  }

  const withAddress = method ? needsAddress(method.type) : true;
  const shippingAddress = withAddress ? validateAddress('shipping', input.shippingAddress, errors) : null;
  const billingAddress =
    input.billingSameAsShipping && shippingAddress
      ? shippingAddress
      : validateAddress('billing', input.billingAddress, errors);

  const pickupPoint = method && needsPickupPoint(method.type) ? cleanPickupPoint(input.pickupPoint) : null;
  if (method && needsPickupPoint(method.type) && !pickupPoint) {
    errors.pickupPoint = 'Odaberite paketomat.';
  }

  if (Object.keys(errors).length > 0 || !method || !paymentMethod) {
    return { ok: false, error: 'Provjerite označena polja.', fieldErrors: errors };
  }

  // ---- 2. Load products + variants, check stock, price from DB ---------------
  const productIds = [...new Set(items.map((i) => i.productId))];
  const rows = await db.query.products.findMany({
    where: inArray(products.id, productIds),
    with: { images: true, variants: true },
  });

  const problems: string[] = [];
  const lines: Omit<typeof orderItems.$inferInsert, 'order_id'>[] = [];

  for (const item of items) {
    const product = rows.find((p) => p.id === item.productId);
    if (!product || !product.is_active) {
      problems.push('Jedan od proizvoda više nije dostupan.');
      continue;
    }
    const activeVariants = product.variants.filter((v) => v.is_active);
    const variant = item.variantId ? activeVariants.find((v) => v.id === item.variantId) : undefined;
    if (activeVariants.length > 0 && !variant) {
      problems.push(`„${product.name}”: odaberite dostupnu varijantu.`);
      continue;
    }
    const stock = variant ? variant.stock_quantity : product.stock_quantity;
    if (stock < item.quantity) {
      const label = variant ? `${product.name} (${variant.name})` : product.name;
      problems.push(stock > 0 ? `„${label}”: na zalihi je još samo ${stock} kom.` : `„${label}” je rasprodan.`);
      continue;
    }
    const unit = variant?.price_cents ?? product.price_cents;
    const image = [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    lines.push({
      product_id: product.id,
      variant_id: variant?.id ?? null,
      product_name: product.name,
      variant_name: variant?.name ?? null,
      sku: variant?.sku ?? product.sku,
      image_url: image?.url ?? null,
      unit_price_cents: unit,
      quantity: item.quantity,
      line_total_cents: unit * item.quantity,
    });
  }

  if (problems.length > 0) {
    return { ok: false, error: `${problems.join(' ')} Ažurirajte košaricu.` };
  }

  const subtotalCents = lines.reduce((sum, i) => sum + i.line_total_cents, 0);
  const quote = quoteShipping(method, subtotalCents, shippingAddress?.country);
  if (!quote.available) {
    return { ok: false, error: quote.reason, fieldErrors: { shippingMethodId: quote.reason } };
  }
  const shippingCents = quote.priceCents;
  const totalCents = subtotalCents + shippingCents;
  if (paymentMethod !== 'bank_transfer' && totalCents < 50) {
    return { ok: false, error: 'Minimalni iznos za kartično plaćanje je 0,50 €.' };
  }

  // ---- 3. Create the order (and reserve stock for bank transfers) -----------
  const user = await getCurrentUser();
  const accessToken = generateAccessToken();

  let order: { id: string; order_number: number };
  try {
    order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(orders)
        .values({
          access_token: accessToken,
          user_id: user?.id ?? null,
          email,
          phone,
          status: 'awaiting_payment',
          payment_method: paymentMethod,
          shipping_method_id: method.id,
          shipping_method_name: method.name,
          shipping_method_type: method.type,
          pickup_point: pickupPoint,
          subtotal_cents: subtotalCents,
          shipping_cents: shippingCents,
          total_cents: totalCents,
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          customer_note: clean(input.note, 1000) || null,
        })
        .returning({ id: orders.id, order_number: orders.order_number, created_at: orders.created_at });

      await tx.insert(orderItems).values(lines.map((l) => ({ ...l, order_id: created.id })));

      if (paymentMethod === 'bank_transfer') {
        await reserveStock(tx, lines.map((l) => ({ product_id: l.product_id ?? null, variant_id: l.variant_id ?? null, quantity: l.quantity })));
        await tx
          .update(orders)
          .set({
            stock_decremented_at: new Date(),
            payment_reference: buildPaymentReference(bankReferenceTemplate(), created.order_number, created.created_at),
          })
          .where(eq(orders.id, created.id));
      }
      return { id: created.id, order_number: created.order_number };
    });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return { ok: false, error: 'Netko je upravo kupio zadnji komad jednog od proizvoda. Ažurirajte košaricu.' };
    }
    console.error('[checkout] order insert', error);
    return { ok: false, error: 'Narudžbu nije bilo moguće spremiti. Pokušajte ponovno.' };
  }

  // ---- 4. Payment provider -------------------------------------------------
  let clientSecret: string | undefined;
  let teya: TeyaRedirect | undefined;

  if (paymentMethod === 'stripe') {
    const stripe = getStripe();
    try {
      if (!stripe) throw new Error('Stripe not ready');
      const intent = await stripe.paymentIntents.create(
        {
          amount: totalCents,
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          receipt_email: email,
          description: `Narudžba #${order.order_number}`,
          metadata: { order_id: order.id, order_number: String(order.order_number) },
          ...(shippingAddress
            ? {
                shipping: {
                  name: shippingAddress.full_name,
                  phone: shippingAddress.phone ?? phone,
                  address: {
                    line1: shippingAddress.street,
                    city: shippingAddress.city,
                    postal_code: shippingAddress.postal_code,
                    country: shippingAddress.country,
                  },
                },
              }
            : {}),
        },
        { idempotencyKey: `order-${order.id}` },
      );
      if (!intent.client_secret) throw new Error('PaymentIntent without client_secret');
      clientSecret = intent.client_secret;
      await db.update(orders).set({ stripe_payment_intent_id: intent.id }).where(eq(orders.id, order.id));
    } catch (error) {
      console.error('[checkout] stripe', error instanceof Error ? error.message : error);
      await db.delete(orders).where(eq(orders.id, order.id));
      return { ok: false, error: 'Plaćanje trenutno nije dostupno. Pokušajte ponovno za nekoliko minuta.' };
    }
  }

  if (paymentMethod === 'teya') {
    const params = await teyaParamsForOrder(order.id);
    if (!params) {
      await db.delete(orders).where(eq(orders.id, order.id));
      return { ok: false, error: 'Plaćanje trenutno nije dostupno. Pokušajte ponovno za nekoliko minuta.' };
    }
    teya = params;
  }

  // ---- 5. Optionally save the address to the customer's account -------------
  if (user && input.saveAddress && shippingAddress) {
    const [{ value: existing }] = await db
      .select({ value: count() })
      .from(addresses)
      .where(eq(addresses.user_id, user.id));
    await db.insert(addresses).values({
      user_id: user.id,
      full_name: shippingAddress.full_name,
      company: shippingAddress.company ?? null,
      street: shippingAddress.street,
      city: shippingAddress.city,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country,
      phone: shippingAddress.phone ?? phone,
      is_default: existing === 0,
    });
  }

  await setOrderAccessCookie(order.id, accessToken);
  if (paymentMethod === 'bank_transfer') await sendOrderEmail(order.id, 'bank_transfer');

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    accessToken,
    paymentMethod,
    subtotalCents,
    shippingCents,
    totalCents,
    clientSecret,
    teya,
  };
}

/** "Pokušaj ponovno" for an unpaid Teya order: a fresh signed form. */
export async function retryTeyaPayment(orderId: string, token: string | null): Promise<TeyaRedirect | null> {
  const order = await loadViewableOrder(orderId, token);
  if (!order || order.payment_method !== 'teya') return null;
  if (order.payment_status === 'paid' || order.status === 'cancelled') return null;
  return teyaParamsForOrder(order.id);
}
