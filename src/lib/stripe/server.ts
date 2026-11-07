import 'server-only';
import Stripe from 'stripe';
import { envValue } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';

let stripe: Stripe | null = null;

/** Server-side Stripe singleton. Null unless the stripe module is ready (see src/config/modules.ts). */
export function getStripe(): Stripe | null {
  if (!isModuleReady('stripe')) return null;
  if (!stripe) stripe = new Stripe(envValue('STRIPE_SECRET_KEY')!);
  return stripe;
}

export function stripePublishableKey(): string | null {
  return isModuleReady('stripe') ? envValue('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')! : null;
}

export function stripeWebhookSecret(): string | null {
  return envValue('STRIPE_WEBHOOK_SECRET') ?? null;
}
