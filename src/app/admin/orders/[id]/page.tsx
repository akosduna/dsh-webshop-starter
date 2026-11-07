import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { OrderDetails, ORDER_DETAIL_SELECT } from '@/components/orders/order-details';
import { OrderStatusForm } from '@/components/admin/order-status-form';
import { requireAdmin } from '@/lib/auth';

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: order } = await supabase.from('orders').select(ORDER_DETAIL_SELECT).eq('id', id).maybeSingle();
  if (!order) notFound();

  const stripeMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_') ? '' : 'test/';

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-primary hover:underline">
        ← Narudžbe
      </Link>
      <h1 className="text-2xl font-semibold">Narudžba #{order.order_number}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <OrderDetails order={order} />
        <div className="space-y-4">
          <Card>
            <OrderStatusForm orderId={order.id} status={order.status} />
          </Card>
          {order.stripe_payment_intent_id && (
            <Card className="text-sm">
              <p className="mb-1 font-semibold">Stripe</p>
              <a
                href={`https://dashboard.stripe.com/${stripeMode}payments/${order.stripe_payment_intent_id}`}
                target="_blank"
                rel="noreferrer"
                className="break-all text-primary hover:underline"
              >
                {order.stripe_payment_intent_id}
              </a>
              <p className="mt-2 text-xs text-muted-foreground">Povrat novca radi se u Stripe Dashboardu.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
