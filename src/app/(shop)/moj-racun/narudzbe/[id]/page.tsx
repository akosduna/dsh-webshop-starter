import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BankTransferDetails } from '@/components/checkout/bank-transfer-details';
import { OrderDetails } from '@/components/orders/order-details';
import { requireUser } from '@/lib/auth/server';
import { bankReservationDays, getBankDetails } from '@/lib/payments/bank-transfer';
import { loadOrderWithItems } from '@/lib/shop/order-viewer';

export const metadata: Metadata = { title: 'Narudžba', robots: { index: false } };

export default async function MyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/moj-racun/narudzbe/${id}`);
  const order = await loadOrderWithItems(id);
  // Customers only see their own orders.
  if (!order || order.user_id !== user.id) notFound();

  const awaitingTransfer =
    order.payment_method === 'bank_transfer' &&
    order.payment_status !== 'paid' &&
    order.status !== 'cancelled' &&
    !!order.payment_reference;
  const bank = awaitingTransfer ? getBankDetails() : null;

  return (
    <div className="space-y-6">
      <Link href="/moj-racun/narudzbe" className="text-sm text-primary hover:underline">
        ← Sve narudžbe
      </Link>
      <h1 className="text-2xl font-semibold">Narudžba #{order.order_number}</h1>
      {bank && order.payment_reference && (
        <BankTransferDetails
          order={{ ...order, payment_reference: order.payment_reference }}
          bank={bank}
          reservationDays={bankReservationDays()}
        />
      )}
      <OrderDetails order={order} />
    </div>
  );
}
