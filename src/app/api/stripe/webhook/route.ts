import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, stripeWebhookSecret } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/service';
import { confirmPaidOrder } from '@/lib/shop/payments';

/**
 * Stripe webhook. Subscribe to: payment_intent.succeeded,
 * payment_intent.payment_failed, charge.refunded.
 * Signature verification needs the raw body, so read it with request.text().
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe nije konfiguriran.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error('[stripe-webhook] invalid signature', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const result = await confirmPaidOrder(event.data.object);
        if (result === 'paid') {
          console.info(`[stripe-webhook] order ${event.data.object.metadata?.order_id} paid`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const orderId = event.data.object.metadata?.order_id;
        if (orderId) {
          await createServiceClient()
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', orderId)
            .eq('payment_status', 'unpaid');
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const intentId =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (intentId && charge.refunded) {
          await createServiceClient()
            .from('orders')
            .update({ payment_status: 'refunded' })
            .eq('stripe_payment_intent_id', intentId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // 500 makes Stripe retry later; mark_order_paid is idempotent.
    console.error('[stripe-webhook] handler error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
