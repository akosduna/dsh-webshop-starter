'use client';

import { useActionState } from 'react';
import { Field, FormMessage, Select } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateOrderStatus } from '@/app/admin/actions';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/shop/orders';

export function OrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  const [state, action] = useActionState(updateOrderStatus, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <Field label="Status narudžbe" htmlFor="status">
        <Select id="status" name="status" defaultValue={status}>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      {state?.success && <FormMessage type="success">{state.success}</FormMessage>}
      <SubmitButton className="w-full" pendingText="Spremanje…">
        Spremi status
      </SubmitButton>
    </form>
  );
}
