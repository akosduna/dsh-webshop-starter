'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe/server';
import { shippingCostCents } from '@/lib/shop/shipping';
import type { AddressSnapshot } from '@/lib/shop/orders';
import type { AddressInput, CheckoutInput, CheckoutResult } from '@/lib/shop/checkout-types';
import type { TablesInsert } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

function clean(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validateAddress(
  prefix: string,
  address: AddressInput,
  errors: Record<string, string>,
): AddressSnapshot {
  const snapshot: AddressSnapshot = {
    full_name: clean(address.full_name),
    company: clean(address.company) || null,
    street: clean(address.street),
    city: clean(address.city, 100),
    postal_code: clean(address.postal_code, 20),
    country: clean(address.country, 2).toUpperCase() || 'HR',
    phone: clean(address.phone, 40) || null,
  };
  if (!snapshot.full_name) errors[`${prefix}.full_name`] = 'Upišite ime i prezime.';
  if (!snapshot.street) errors[`${prefix}.street`] = 'Upišite ulicu i kućni broj.';
  if (!snapshot.city) errors[`${prefix}.city`] = 'Upišite grad.';
  if (!snapshot.postal_code) errors[`${prefix}.postal_code`] = 'Upišite poštanski broj.';
  return snapshot;
}

/**
 * Creates an order from the cart and a Stripe PaymentIntent for it.
 * All prices, stock and shipping are recalculated from the database: the
 * browser only sends product ids and quantities.
 */
export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      error: 'Online plaćanje još nije postavljeno (nedostaju Stripe ključevi).',
    };
  }

  // ---- 1. Validate the form --------------------------------------------------
  const errors: Record<string, string> = {};
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone, 40);
  if (!EMAIL_RE.test(email)) errors.email = 'Upišite ispravnu e-mail adresu.';
  if (!phone) errors.phone = 'Upišite broj telefona.';
  if (!input.acceptTerms) errors.acceptTerms = 'Potrebno je prihvatiti uvjete kupnje.';
  if (!UUID_RE.test(input.shippingMethodId ?? '')) errors.shippingMethodId = 'Odaberite način dostave.';

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

  const service = createServiceClient();

  const { data: method } = UUID_RE.test(input.shippingMethodId ?? '')
    ? await service
        .from('shipping_methods')
        .select('id, name, description, type, price_cents, free_over_cents')
        .eq('id', input.shippingMethodId)
        .eq('is_active', true)
        .maybeSingle()
    : { data: null };
  if (!method) errors.shippingMethodId = 'Odaberite način dostave.';

  const isPickup = method?.type === 'pickup';
  const shippingAddress = isPickup
    ? null
    : validateAddress('shipping', input.shippingAddress, errors);
  const billingAddress =
    input.billingSameAsShipping && shippingAddress
      ? shippingAddress
      : validateAddress('billing', input.billingAddress, errors);

  if (Object.keys(errors).length > 0 || !method) {
    return { ok: false, error: 'Provjerite označena polja.', fieldErrors: errors };
  }

  // ---- 2. Load products + variants, check stock, price from DB ---------------
  const productIds = [...new Set(items.map((i) => i.productId))];
  const { data: products, error: productsError } = await service
    .from('products')
    .select(
      'id, name, sku, price_cents, stock_quantity, is_active, product_images(url, sort_order), product_variants(id, name, sku, price_cents, stock_quantity, is_active)',
    )
    .in('id', productIds);
  if (productsError) {
    console.error('[checkout] products', productsError.message);
    return { ok: false, error: 'Greška pri provjeri proizvoda. Pokušajte ponovno.' };
  }

  const problems: string[] = [];
  const orderItems: Omit<TablesInsert<'order_items'>, 'order_id'>[] = [];

  for (const item of items) {
    const product = products?.find((p) => p.id === item.productId);
    if (!product || !product.is_active) {
      problems.push('Jedan od proizvoda više nije dostupan.');
      continue;
    }
    const activeVariants = product.product_variants.filter((v) => v.is_active);
    const variant = item.variantId
      ? activeVariants.find((v) => v.id === item.variantId)
      : undefined;
    if (activeVariants.length > 0 && !variant) {
      problems.push(`„${product.name}”: odaberite dostupnu varijantu.`);
      continue;
    }
    const stock = variant ? variant.stock_quantity : product.stock_quantity;
    if (stock < item.quantity) {
      const label = variant ? `${product.name} (${variant.name})` : product.name;
      problems.push(
        stock > 0 ? `„${label}”: na zalihi je još samo ${stock} kom.` : `„${label}” je rasprodan.`,
      );
      continue;
    }
    const unit = variant?.price_cents ?? product.price_cents;
    const image = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    orderItems.push({
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

  const subtotalCents = orderItems.reduce((sum, i) => sum + i.line_total_cents, 0);
  const shippingCents = shippingCostCents(method, subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  if (totalCents < 50) {
    return { ok: false, error: 'Minimalni iznos narudžbe je 0,50 €.' };
  }

  // ---- 3. Create the order -------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order, error: orderError } = await service
    .from('orders')
    .insert({
      user_id: user?.id ?? null,
      email,
      phone,
      shipping_method_id: method.id,
      shipping_method_name: method.name,
      shipping_method_type: method.type,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      customer_note: clean(input.note, 1000) || null,
    })
    .select('id, order_number')
    .single();
  if (orderError || !order) {
    console.error('[checkout] order insert', orderError?.message);
    return { ok: false, error: 'Narudžbu nije bilo moguće spremiti. Pokušajte ponovno.' };
  }

  const { error: itemsError } = await service
    .from('order_items')
    .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    console.error('[checkout] order_items insert', itemsError.message);
    await service.from('orders').delete().eq('id', order.id);
    return { ok: false, error: 'Narudžbu nije bilo moguće spremiti. Pokušajte ponovno.' };
  }

  // ---- 4. Stripe PaymentIntent ---------------------------------------------
  let clientSecret: string;
  try {
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
    await service
      .from('orders')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', order.id);
  } catch (error) {
    console.error('[checkout] stripe', error instanceof Error ? error.message : error);
    await service.from('orders').delete().eq('id', order.id);
    return { ok: false, error: 'Plaćanje trenutno nije dostupno. Pokušajte ponovno za nekoliko minuta.' };
  }

  // ---- 5. Optionally save the address to the customer's account -------------
  if (user && input.saveAddress && shippingAddress) {
    const { count } = await supabase
      .from('addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    await supabase.from('addresses').insert({
      user_id: user.id,
      full_name: shippingAddress.full_name,
      company: shippingAddress.company ?? null,
      street: shippingAddress.street,
      city: shippingAddress.city,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country,
      phone: shippingAddress.phone ?? phone,
      is_default: !count,
    });
  }

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    clientSecret,
    subtotalCents,
    shippingCents,
    totalCents,
  };
}
