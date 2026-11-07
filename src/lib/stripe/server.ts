import 'server-only';
import Stripe from 'stripe';

let stripe: Stripe | null = null;

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes('REPLACE_ME');
}

/** Server-side Stripe singleton. Returns null until real keys are configured. */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (isPlaceholder(secretKey)) return null;
  if (!stripe) stripe = new Stripe(secretKey!);
  return stripe;
}

export function isStripeConfigured(): boolean {
  return (
    !isPlaceholder(process.env.STRIPE_SECRET_KEY) &&
    !isPlaceholder(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  );
}

export function stripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return isPlaceholder(secret) ? null : secret!;
}
