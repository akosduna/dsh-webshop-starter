import { Card } from '@/components/ui/card';
import { bankPaymentDescription, formatIban, type BankDetails } from '@/lib/payments/hub3';
import { orderBarcodePath } from '@/lib/shop/order-access';
import { formatPrice } from '@/lib/utils';

/** Payment instructions + HUB-3 barcode for an unpaid bank-transfer order. */
export function BankTransferDetails({
  order,
  bank,
  reservationDays,
}: {
  order: { id: string; access_token: string; order_number: number; total_cents: number; payment_reference: string };
  bank: BankDetails;
  reservationDays: number;
}) {
  const rows: [string, string][] = [
    ['Iznos', formatPrice(order.total_cents)],
    ['IBAN primatelja', formatIban(bank.iban)],
    ['Primatelj', `${bank.recipientName}, ${bank.recipientStreet}, ${bank.recipientCity}`],
    ['Model', bank.model],
    ['Poziv na broj', order.payment_reference],
    ['Opis plaćanja', bankPaymentDescription(order.order_number)],
  ];

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Podaci za uplatu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Narudžbu šaljemo kad uplata stigne na račun. Proizvode držimo rezervirane {reservationDays} dana.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[130px_1fr] gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words" data-testid={`bank-${label}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <figure className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, token-protected PNG from our API */}
          <img
            src={orderBarcodePath(order)}
            alt="HUB-3 barkod za plaćanje"
            width={260}
            className="mx-auto h-auto w-[260px] rounded border bg-white p-2"
          />
          <figcaption className="mt-2 text-xs text-muted-foreground">Skenirajte u aplikaciji svoje banke</figcaption>
        </figure>
      </div>
    </Card>
  );
}
