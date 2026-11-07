import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClearCart } from '@/components/checkout/clear-cart';
import { createServiceClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe/server';
import { getUser } from '@/lib/auth';
import { confirmPaidOrder } from '@/lib/shop/payments';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = { title: 'Narudžba', robots: { index: false } };
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export default async function OrderSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderId = typeof params.order === 'string' ? params.order : '';
  const intentParam = typeof params.payment_intent === 'string' ? params.payment_intent : '';
  if (!UUID_RE.test(orderId)) return <NotFoundCard />;

  const service = createServiceClient();
  const loadOrder = () =>
    service
      .from('orders')
      .select(
        'id, order_number, email, user_id, status, payment_status, total_cents, subtotal_cents, shipping_cents, shipping_method_name, stripe_payment_intent_id, order_items(id, product_name, variant_name, quantity, line_total_cents)',
      )
      .eq('id', orderId)
      .maybeSingle();

  const { data: initial } = await loadOrder();
  if (!initial) return <NotFoundCard />;

  // Guests prove access with the payment_intent id Stripe appends to the URL;
  // logged-in customers can also open their own order.
  const { user } = await getUser();
  const allowed =
    (!!intentParam && intentParam === initial.stripe_payment_intent_id) ||
    (!!user && user.id === initial.user_id);
  if (!allowed) return <NotFoundCard />;

  // Fallback for when the webhook hasn't arrived yet (or isn't set up
  // locally). Idempotent together with the webhook.
  let order = initial;
  let intentStatus: string | null = null;
  const stripe = getStripe();
  if (stripe && order.stripe_payment_intent_id && order.payment_status !== 'paid') {
    try {
      const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      intentStatus = intent.status;
      if (intent.status === 'succeeded') {
        await confirmPaidOrder(intent);
        const { data: refreshed } = await loadOrder();
        if (refreshed) order = refreshed;
      }
    } catch (error) {
      console.error('[success] stripe lookup', error instanceof Error ? error.message : error);
    }
  }

  const paid = order.payment_status === 'paid';
  const processing = !paid && intentStatus === 'processing';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {(paid || processing) && <ClearCart />}
      <Card className="space-y-3 text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        ) : processing ? (
          <Clock className="mx-auto h-12 w-12 text-warning" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
        )}
        <h1 className="text-2xl font-semibold">
          {paid
            ? 'Hvala na narudžbi!'
            : processing
              ? 'Plaćanje se obrađuje'
              : 'Plaćanje nije dovršeno'}
        </h1>
        <p className="text-muted-foreground">
          {paid
            ? `Narudžba #${order.order_number} je zaprimljena i plaćena. Ako bude potrebno, javit ćemo vam se na ${order.email}.`
            : processing
              ? `Narudžba #${order.order_number} čeka potvrdu banke. Status ćete vidjeti u svom računu ili e-mailu.`
              : 'Kartica nije terećena. Vratite se u košaricu i pokušajte ponovno.'}
        </p>
      </Card>

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
          <div className="flex justify-between font-semibold">
            <span>Ukupno</span>
            <span>{formatPrice(order.total_cents)}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-center gap-3">
        {paid || processing ? (
          <Link href="/proizvodi" className={buttonVariants()}>
            Nastavi kupovinu
          </Link>
        ) : (
          <Link href="/kosarica" className={buttonVariants()}>
            Natrag u košaricu
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
