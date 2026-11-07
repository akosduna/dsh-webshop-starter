'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form';
import { TeyaRedirectForm } from '@/components/checkout/teya-redirect-form';
import { retryTeyaPayment } from '@/app/(shop)/naplata/actions';
import type { TeyaRedirect } from '@/lib/shop/checkout-types';

export function TeyaRetry({ orderId, accessToken }: { orderId: string; accessToken: string | null }) {
  const [redirect, setRedirect] = useState<TeyaRedirect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (redirect) return <TeyaRedirectForm actionUrl={redirect.actionUrl} fields={redirect.fields} />;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const next = await retryTeyaPayment(orderId, accessToken);
            if (next) setRedirect(next);
            else setError('Plaćanje trenutno nije moguće ponoviti. Javite nam se.');
          })
        }
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Pokušaj ponovno platiti
      </Button>
      {error && <FormMessage type="error">{error}</FormMessage>}
    </div>
  );
}
