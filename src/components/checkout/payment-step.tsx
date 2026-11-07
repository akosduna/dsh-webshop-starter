'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form';
import { formatPrice } from '@/lib/utils';

export function PaymentStep({
  orderId,
  accessToken,
  totalCents,
}: {
  orderId: string;
  accessToken: string;
  totalCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    // On success Stripe redirects to return_url (with ?payment_intent=…).
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/naplata/uspjeh?order=${orderId}&t=${encodeURIComponent(accessToken)}`,
      },
    });

    // Only reached when the payment failed or needs another attempt.
    setError(stripeError.message ?? 'Plaćanje nije uspjelo. Pokušajte ponovno.');
    setSubmitting(false);
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && <FormMessage type="error">{error}</FormMessage>}
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Plati {formatPrice(totalCents)}
      </Button>
    </form>
  );
}
