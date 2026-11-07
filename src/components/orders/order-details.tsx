import { Badge, Card } from '@/components/ui/card';
import { ProductImage } from '@/components/ui/product-image';
import { COUNTRIES } from '@/lib/shop/checkout-types';
import {
  PAYMENT_STATUS_LABELS,
  orderStatusLabel,
  parseAddressSnapshot,
  type AddressSnapshot,
} from '@/lib/shop/orders';
import { formatDate, formatPrice } from '@/lib/utils';
import type { Json } from '@/types/database';

export type OrderForDisplay = {
  order_number: number;
  created_at: string;
  status: string;
  payment_status: string;
  email: string;
  phone: string | null;
  shipping_method_name: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: Json | null;
  billing_address: Json;
  customer_note: string | null;
  order_items: {
    id: string;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    image_url: string | null;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
  }[];
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'cancelled'
      ? 'danger'
      : status === 'pending_payment'
        ? 'warning'
        : status === 'completed' || status === 'shipped'
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

export function OrderDetails({ order }: { order: OrderForDisplay }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{formatDate(order.created_at)}</span>
        <StatusBadge status={order.status} />
        <Badge tone={order.payment_status === 'paid' ? 'success' : 'neutral'}>
          {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
        </Badge>
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
                <p className="text-muted-foreground">
                  {[item.variant_name, item.sku].filter(Boolean).join(' · ')}
                </p>
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
        <AddressBlock title="Adresa dostave" address={parseAddressSnapshot(order.shipping_address)} />
        <AddressBlock title="Podaci za račun" address={parseAddressSnapshot(order.billing_address)} />
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

export const ORDER_DETAIL_SELECT =
  'id, order_number, created_at, status, payment_status, email, phone, shipping_method_name, subtotal_cents, shipping_cents, total_cents, shipping_address, billing_address, customer_note, stripe_payment_intent_id, order_items(id, product_name, variant_name, sku, image_url, unit_price_cents, quantity, line_total_cents)' as const;
