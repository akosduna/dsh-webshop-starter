import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card } from '@/components/ui/card';
import { ActionButton } from '@/components/admin/action-button';
import { OrderStatusForm } from '@/components/admin/order-status-form';
import { OrderDetails } from '@/components/orders/order-details';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';
import { formatIban } from '@/lib/payments/hub3';
import { trackingUrlFor } from '@/lib/shipping/tracking-urls';
import { loadOrderWithItems, type OrderWithItems } from '@/lib/shop/order-viewer';
import { orderBarcodePath } from '@/lib/shop/order-access';
import { holdsStock } from '@/lib/shop/order-lifecycle';
import { envValue } from '@/lib/env';
import {
  cancelOrderAction,
  cancelShipmentAction,
  createShipmentAction,
  markBankTransferPaid,
  refreshTrackingAction,
} from '../actions';

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'U pripremi',
  labeled: 'Naljepnica kreirana',
  delivered: 'Dostavljeno',
  error: 'Greška',
  cancelled: 'Otkazano',
};

function PaymentCard({ order }: { order: OrderWithItems }) {
  const paid = order.payment_status === 'paid';
  const cancelled = order.status === 'cancelled';
  const isTransfer = order.payment_method === 'bank_transfer';
  const cancellable = !cancelled && !['shipped', 'delivered', 'completed'].includes(order.status);
  const stripeMode = envValue('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')?.startsWith('pk_live_') ? '' : 'test/';

  return (
    <Card className="space-y-3 text-sm">
      <p className="font-semibold">Plaćanje</p>
      {isTransfer && order.payment_reference && (
        <div className="space-y-1">
          <p>
            Poziv na broj: <span className="font-medium">{order.payment_reference}</span>
          </p>
          {envValue('BANK_IBAN') && (
            <p className="text-muted-foreground">IBAN: {formatIban(envValue('BANK_IBAN') ?? '')}</p>
          )}
          {!paid && !cancelled && (
            <a href={orderBarcodePath(order)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Barkod za plaćanje
            </a>
          )}
        </div>
      )}
      {order.stripe_payment_intent_id && (
        <a
          href={`https://dashboard.stripe.com/${stripeMode}payments/${order.stripe_payment_intent_id}`}
          target="_blank"
          rel="noreferrer"
          className="block break-all text-primary hover:underline"
        >
          Stripe: {order.stripe_payment_intent_id}
        </a>
      )}
      {order.teya_auth_code && (
        <p className="break-all">
          Teya autorizacija: {order.teya_auth_code}
          {order.teya_card_mask && ` (${order.teya_card_mask})`}
        </p>
      )}
      {order.paid_at && <p className="text-muted-foreground">Plaćeno: {order.paid_at.toLocaleString('hr-HR')}</p>}

      {isTransfer && !paid && !cancelled && (
        <ActionButton variant="default" className="w-full" action={markBankTransferPaid.bind(null, order.id)}>
          Označi kao plaćeno
        </ActionButton>
      )}
      {cancellable && (
        <ActionButton
          className="w-full"
          action={cancelOrderAction.bind(null, order.id)}
          confirmText={holdsStock(order) ? 'Otkazati i vratiti zalihe?' : 'Otkazati narudžbu?'}
        >
          Otkaži narudžbu
        </ActionButton>
      )}
      {paid && !isTransfer && cancellable && (
        <p className="text-xs text-muted-foreground">Povrat novca radi se kod pružatelja plaćanja (Stripe / Teya).</p>
      )}
    </Card>
  );
}

function ShipmentCard({ order }: { order: OrderWithItems }) {
  const type = order.shipping_method_type;
  const provider = type === 'gls_address' || type === 'gls_parcel' ? 'gls' : type === 'boxnow' ? 'boxnow' : null;
  if (!provider) return null;

  const ready = isModuleReady(provider);
  const shipment = order.shipments.find((s) => s.provider === provider && s.status !== 'cancelled');
  const paid = order.payment_status === 'paid';
  const providerName = provider === 'gls' ? 'GLS' : 'BOX NOW';

  return (
    <Card className="space-y-3 text-sm" data-testid="shipment-card">
      <p className="font-semibold">Pošiljka ({providerName})</p>
      {!ready && <p className="text-destructive">Modul {providerName} nije spreman — vidi Pregled → Moduli.</p>}
      {shipment ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={shipment.status === 'error' ? 'danger' : shipment.status === 'delivered' ? 'success' : 'primary'}>
              {SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status}
            </Badge>
            {shipment.provider_status && <span className="text-muted-foreground">{shipment.provider_status}</span>}
          </div>
          {shipment.error_message && <p className="text-destructive">{shipment.error_message}</p>}
          {shipment.tracking_number && (
            <a
              href={trackingUrlFor(provider, shipment.tracking_number)}
              target="_blank"
              rel="noreferrer"
              className="block text-primary hover:underline"
            >
              Praćenje: {shipment.tracking_number}
            </a>
          )}
          {shipment.status === 'labeled' && (
            <a
              href={`/api/admin/shipments/${shipment.id}/label`}
              target="_blank"
              rel="noreferrer"
              className="block text-primary hover:underline"
            >
              Naljepnica (PDF)
            </a>
          )}
          {ready && (shipment.status === 'pending' || shipment.status === 'error') && (
            <ActionButton variant="default" className="w-full" action={createShipmentAction.bind(null, order.id, provider)}>
              Pokušaj ponovno
            </ActionButton>
          )}
          {ready && provider === 'gls' && shipment.tracking_number && shipment.status !== 'delivered' && (
            <ActionButton className="w-full" action={refreshTrackingAction.bind(null, order.id)}>
              Osvježi praćenje
            </ActionButton>
          )}
          {ready && shipment.status !== 'delivered' && (
            <ActionButton
              className="w-full"
              action={cancelShipmentAction.bind(null, order.id, shipment.id)}
              confirmText="Otkazati pošiljku?"
            >
              Otkaži pošiljku
            </ActionButton>
          )}
        </div>
      ) : paid ? (
        ready && (
          <ActionButton variant="default" className="w-full" action={createShipmentAction.bind(null, order.id, provider)}>
            Kreiraj pošiljku
          </ActionButton>
        )
      ) : (
        <p className="text-muted-foreground">Pošiljka se kreira kad je narudžba plaćena.</p>
      )}
      {provider === 'boxnow' && (
        <p className="text-xs text-muted-foreground">Status BOX NOW pošiljke stiže automatski (webhook).</p>
      )}
    </Card>
  );
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const order = await loadOrderWithItems(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-primary hover:underline">
        ← Narudžbe
      </Link>
      <h1 className="text-2xl font-semibold">Narudžba #{order.order_number}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <OrderDetails order={order} />
        <div className="space-y-4">
          <PaymentCard order={order} />
          {order.payment_status === 'paid' && order.status !== 'cancelled' && (
            <Card>
              <OrderStatusForm orderId={order.id} status={order.status} />
            </Card>
          )}
          <ShipmentCard order={order} />
        </div>
      </div>
    </div>
  );
}
