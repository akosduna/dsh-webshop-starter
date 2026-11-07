import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderDetails, ORDER_DETAIL_SELECT } from '@/components/orders/order-details';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Narudžba', robots: { index: false } };

export default async function MyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/moj-racun/narudzbe/${id}`);
  // RLS already limits rows to the user's own orders; the eq() is explicit intent.
  const { data: order } = await supabase
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/moj-racun/narudzbe" className="text-sm text-primary hover:underline">
        ← Sve narudžbe
      </Link>
      <h1 className="text-2xl font-semibold">Narudžba #{order.order_number}</h1>
      <OrderDetails order={order} />
    </div>
  );
}
