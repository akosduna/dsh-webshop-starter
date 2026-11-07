'use client';

import { useActionState } from 'react';
import { Field, FormMessage, Select } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateOrderStatus } from '@/app/admin/orders/actions';
import { FULFILMENT_STATUSES, ORDER_STATUS_LABELS } from '@/lib/shop/orders';

/** Fulfilment status for paid orders. Payment (paid / cancelled) has its own buttons. */
export function OrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  const [state, action] = useActionState(updateOrderStatus, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <Field label="Status obrade" htmlFor="status">
        <Select id="status" name="status" defaultValue={status}>
          {FULFILMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-xs text-muted-foreground">Kod statusa „Poslano” kupac dobiva e-mail (ako je modul uključen).</p>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      {state?.success && <FormMessage type="success">{state.success}</FormMessage>}
      <SubmitButton className="w-full" pendingText="Spremanje…">
        Spremi status
      </SubmitButton>
    </form>
  );
}
