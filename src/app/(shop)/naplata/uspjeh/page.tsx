import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, CheckCircle2, Clock, Landmark, XCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BankTransferDetails } from '@/components/checkout/bank-transfer-details';
import { ClearCart } from '@/components/checkout/clear-cart';
import { TeyaRetry } from '@/components/checkout/teya-retry';
import { getCurrentUser } from '@/lib/auth/server';
import { bankReservationDays, getBankDetails } from '@/lib/payments/bank-transfer';
import { confirmStripePayment } from '@/lib/shop/payments';
import { loadViewableOrder, type OrderWithItems } from '@/lib/shop/order-viewer';
import { pickupPointLine } from '@/lib/shop/orders';
import { getStripe } from '@/lib/stripe/server';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = { title: 'Narudžba', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function NotFoundCard() {
  return (
    <Card className="mx-auto max-w-xl py-12 text-center">
      <p className="text-muted-foreground">Narudžba nije pronađena.</p>
      <Link href="/" className={buttonVariants({ className: 'mt-6' })}>
        Na početnu
      </Link>
    </Card>
  );
}

type View = 'paid' | 'processing' | 'bank_transfer' | 'cancelled' | 'failed';

function viewFor(order: OrderWithItems, intentStatus: string | null): View {
  if (order.payment_status === 'paid') return 'paid';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.payment_method === 'bank_transfer') return 'bank_transfer';
  if (intentStatus === 'processing') return 'processing';
  return 'failed';
}

const HEADINGS: Record<View, string> = {
  paid: 'Hvala na narudžbi!',
  processing: 'Plaćanje se obrađuje',
  bank_transfer: 'Narudžba je zaprimljena',
  cancelled: 'Narudžba je otkazana',
  failed: 'Plaćanje nije dovršeno',
};

export default async function OrderSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderId = typeof params.order === 'string' ? params.order : '';
  const token = typeof params.t === 'string' ? params.t : null;
  const teyaOutcome = typeof params.teya === 'string' ? params.teya : null;

  let order = await loadViewableOrder(orderId, token);
  if (!order) return <NotFoundCard />;

  // Fallback for when the Stripe webhook hasn't arrived yet (or isn't set up
  // locally). Idempotent together with the webhook.
  let intentStatus: string | null = null;
  const stripe = getStripe();
  if (stripe && order.stripe_payment_intent_id && order.payment_status !== 'paid') {
    try {
      const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      intentStatus = intent.status;
      if (intent.status === 'succeeded') {
        await confirmStripePayment(intent);
        order = (await loadViewableOrder(orderId, token)) ?? order;
      }
    } catch (error) {
      console.error('[success] stripe lookup', error instanceof Error ? error.message : error);
    }
  }

  const user = await getCurrentUser();
  const view = viewFor(order, intentStatus);
  const bank = view === 'bank_transfer' ? getBankDetails() : null;
  const pickup = pickupPointLine(order.pickup_point);

  const message: Record<View, string> = {
    paid: `Narudžba #${order.order_number} je plaćena. Potvrdu i obavijesti šaljemo na ${order.email}.`,
    processing: `Narudžba #${order.order_number} čeka potvrdu banke. Status ćete vidjeti na ovoj stranici.`,
    bank_transfer: `Narudžba #${order.order_number} čeka uplatu. Podaci za plaćanje su ispod.`,
    cancelled: `Narudžba #${order.order_number} je otkazana. Ako je to greška, javite nam se.`,
    failed:
      teyaOutcome === 'odustao'
        ? 'Odustali ste od plaćanja. Kartica nije terećena.'
        : 'Kartica nije terećena. Pokušajte ponovno.',
  };

  const Icon = { paid: CheckCircle2, processing: Clock, bank_transfer: Landmark, cancelled: Ban, failed: XCircle }[view];
  const iconColor = {
    paid: 'text-success',
    processing: 'text-warning',
    bank_transfer: 'text-primary',
    cancelled: 'text-muted-foreground',
    failed: 'text-destructive',
  }[view];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {(view === 'paid' || view === 'processing' || view === 'bank_transfer') && <ClearCart />}
      <Card className="space-y-3 text-center">
        <Icon className={`mx-auto h-12 w-12 ${iconColor}`} />
        <h1 className="text-2xl font-semibold" data-testid="order-heading">
          {HEADINGS[view]}
        </h1>
        <p className="text-muted-foreground">{message[view]}</p>
        {view === 'failed' && order.payment_method === 'teya' && (
          <div className="flex justify-center pt-2">
            <TeyaRetry orderId={order.id} accessToken={token} />
          </div>
        )}
      </Card>

      {view === 'bank_transfer' && bank && order.payment_reference && (
        <BankTransferDetails
          order={{ ...order, payment_reference: order.payment_reference }}
          bank={bank}
          reservationDays={bankReservationDays()}
        />
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Narudžba #{order.order_number}</h2>
        <ul className="space-y-2 text-sm">
          {order.order_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.quantity} × {i.product_name}
                {i.variant_name && <span className="text-muted-foreground"> ({i.variant_name})</span>}
              </span>
              <span>{formatPrice(i.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Dostava ({order.shipping_method_name})</span>
            <span>{formatPrice(order.shipping_cents)}</span>
          </div>
          {pickup && <p className="text-muted-foreground">Preuzimanje: {pickup}</p>}
          <div className="flex justify-between font-semibold">
            <span>Ukupno</span>
            <span>{formatPrice(order.total_cents)}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-center gap-3">
        {view === 'failed' && order.payment_method === 'stripe' ? (
          <Link href="/kosarica" className={buttonVariants()}>
            Natrag u košaricu
          </Link>
        ) : (
          <Link href="/proizvodi" className={buttonVariants()}>
            Nastavi kupovinu
          </Link>
        )}
        {user && (
          <Link href="/moj-racun/narudzbe" className={buttonVariants({ variant: 'outline' })}>
            Moje narudžbe
          </Link>
        )}
      </div>
    </div>
  );
}
