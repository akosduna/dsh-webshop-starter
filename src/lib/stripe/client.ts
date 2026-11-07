import { loadStripe, type Stripe } from '@stripe/stripe-js';

const stripePromises = new Map<string, Promise<Stripe | null>>();

/**
 * Browser Stripe.js (loads https://js.stripe.com once per key). The
 * publishable key comes from the server as a prop, so the Stripe module can be
 * switched on with env alone.
 */
export function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  let promise = stripePromises.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromises.set(publishableKey, promise);
  }
  return promise;
}
