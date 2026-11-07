import { Badge, Card } from '@/components/ui/card';
import { ProductImage } from '@/components/ui/product-image';
import { COUNTRIES } from '@/lib/shop/checkout-types';
import {
  PAYMENT_STATUS_LABELS,
  orderStatusLabel,
  parseAddressSnapshot,
  paymentMethodLabel,
  pickupPointLine,
  type AddressSnapshot,
} from '@/lib/shop/orders';
import type { OrderWithItems } from '@/lib/shop/order-viewer';
import { trackingUrlFor } from '@/lib/shipping/tracking-urls';
import { formatDate, formatPrice } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'cancelled'
      ? 'danger'
      : status === 'awaiting_payment'
        ? 'warning'
        : status === 'completed' || status === 'shipped' || status === 'delivered'
          ? 'success'
          : 'primary';
  return <Badge tone={tone}>{orderStatusLabel(status)}</Badge>;
}

function AddressBlock({ title, address }: { title: string; address: AddressSnapshot | null }) {
  if (!address) return null;
  const country = COUNTRIES.find((c) => c.code === address.country)?.name ?? address.country;
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{title}</p>
      <address className="text-sm not-italic text-muted-foreground">
        {address.full_name}
        <br />
        {address.company && (
          <>
            {address.company}
            <br />
          </>
        )}
        {address.street}
        <br />
        {address.postal_code} {address.city}
        <br />
        {country}
        {address.phone && (
          <>
            <br />
            {address.phone}
          </>
        )}
      </address>
    </div>
  );
}

export function OrderDetails({ order }: { order: OrderWithItems }) {
  const pickup = pickupPointLine(order.pickup_point);
  const tracked = order.shipments.filter((s) => s.tracking_number && s.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{formatDate(order.created_at)}</span>
        <StatusBadge status={order.status} />
        <Badge tone={order.payment_status === 'paid' ? 'success' : 'neutral'}>
          {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
        </Badge>
        <span>{paymentMethodLabel(order.payment_method)}</span>
      </div>

      <Card className="p-0">
        <ul className="divide-y">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                <ProductImage src={item.image_url} alt={item.product_name} sizes="56px" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{item.product_name}</p>
                <p className="text-muted-foreground">{[item.variant_name, item.sku].filter(Boolean).join(' · ')}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatPrice(item.unit_price_cents)}
              </p>
              <p className="w-24 text-right text-sm font-medium">{formatPrice(item.line_total_cents)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t p-4 text-sm">
          <div className="flex justify-between">
            <span>Međuzbroj</span>
            <span>{formatPrice(order.subtotal_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Dostava ({order.shipping_method_name})</span>
            <span>{formatPrice(order.shipping_cents)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>Ukupno</span>
            <span>{formatPrice(order.total_cents)}</span>
          </div>
        </div>
      </Card>

      <Card className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-sm font-semibold">Kontakt</p>
          <p className="text-sm text-muted-foreground">
            {order.email}
            {order.phone && (
              <>
                <br />
                {order.phone}
              </>
            )}
          </p>
        </div>
        {pickup ? (
          <div>
            <p className="mb-1 text-sm font-semibold">Preuzimanje</p>
            <p className="text-sm text-muted-foreground">{pickup}</p>
          </div>
        ) : (
          <AddressBlock title="Adresa dostave" address={parseAddressSnapshot(order.shipping_address)} />
        )}
        <AddressBlock title="Podaci za račun" address={parseAddressSnapshot(order.billing_address)} />
        {tracked.length > 0 && (
          <div className="sm:col-span-3">
            <p className="mb-1 text-sm font-semibold">Praćenje pošiljke</p>
            <ul className="text-sm">
              {tracked.map((s) => (
                <li key={s.id}>
                  <a
                    href={trackingUrlFor(s.provider, s.tracking_number!)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {s.provider === 'gls' ? 'GLS' : 'BOX NOW'} {s.tracking_number}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {order.customer_note && (
          <div className="sm:col-span-3">
            <p className="mb-1 text-sm font-semibold">Napomena kupca</p>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{order.customer_note}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
