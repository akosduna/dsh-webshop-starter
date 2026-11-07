import 'server-only';
import type Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Marks the order of a succeeded PaymentIntent as paid and decrements stock.
 * Safe to call many times (Stripe retries, webhook + success page): the
 * database function mark_order_paid only acts on the first call.
 *
 * Returns 'paid' on the first successful call, 'already_paid' afterwards.
 */
export async function confirmPaidOrder(
  intent: Stripe.PaymentIntent,
): Promise<'paid' | 'already_paid' | 'ignored'> {
  const orderId = intent.metadata?.order_id;
  if (intent.status !== 'succeeded' || !orderId) return 'ignored';

  const supabase = createServiceClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, total_cents, currency, stripe_payment_intent_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(`Order lookup failed: ${error.message}`);
  if (!order || order.stripe_payment_intent_id !== intent.id) return 'ignored';

  if (
    intent.amount_received !== order.total_cents ||
    intent.currency.toLowerCase() !== order.currency.toLowerCase()
  ) {
    console.error(
      `[payments] amount mismatch for order ${order.id}: received ${intent.amount_received} ${intent.currency}, expected ${order.total_cents} ${order.currency}`,
    );
    return 'ignored';
  }

  const { data: changed, error: rpcError } = await supabase.rpc('mark_order_paid', {
    p_order_id: order.id,
    p_payment_intent_id: intent.id,
  });
  if (rpcError) throw new Error(`mark_order_paid failed: ${rpcError.message}`);
  if (!changed) return 'already_paid';

  // HOOK: send the order confirmation e-mail here (optional extension, see
  // AGENT-SETUP.md → "Opcionalno: e-mail potvrde narudžbe"). This line runs
  // exactly once per order, whether the webhook or the success page got here
  // first. Catch e-mail errors: a failed e-mail must not fail the payment.
  return 'paid';
}
