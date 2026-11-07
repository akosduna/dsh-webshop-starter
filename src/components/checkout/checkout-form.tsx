'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from '@/components/ui/form';
import { AddressFields } from '@/components/checkout/address-fields';
import { PaymentStep } from '@/components/checkout/payment-step';
import { createOrder } from '@/app/(shop)/naplata/actions';
import { getStripePromise } from '@/lib/stripe/client';
import { shippingCostCents, type ShippingMethod } from '@/lib/shop/shipping';
import { emptyAddress, type AddressInput, type CheckoutResult } from '@/lib/shop/checkout-types';
import { cn, formatPrice } from '@/lib/utils';
import { cartSubtotalCents, useCart, useHydrated } from '@/store/cart';

type SavedAddress = {
  id: string;
  full_name: string;
  company: string | null;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
};

type Customer = {
  email: string;
  fullName: string;
  phone: string;
  addresses: SavedAddress[];
};

function toAddressInput(a: SavedAddress): AddressInput {
  return {
    full_name: a.full_name,
    company: a.company ?? '',
    street: a.street,
    city: a.city,
    postal_code: a.postal_code,
    country: a.country,
    phone: a.phone ?? '',
  };
}

type PaidStep = Extract<CheckoutResult, { ok: true }>;

export function CheckoutForm({
  shippingMethods,
  customer,
  stripeReady,
}: {
  shippingMethods: ShippingMethod[];
  customer: Customer | null;
  stripeReady: boolean;
}) {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);

  const defaultAddress = customer?.addresses.find((a) => a.is_default) ?? customer?.addresses[0];
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [shippingMethodId, setShippingMethodId] = useState(shippingMethods[0]?.id ?? '');
  const [shippingAddress, setShippingAddress] = useState<AddressInput>(
    defaultAddress
      ? toAddressInput(defaultAddress)
      : { ...emptyAddress, full_name: customer?.fullName ?? '', phone: customer?.phone ?? '' },
  );
  const [billingSame, setBillingSame] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressInput>(emptyAddress);
  const [note, setNote] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [saveAddress, setSaveAddress] = useState(!!customer && !defaultAddress);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState<PaidStep | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hydrated) return <div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy />;

  if (items.length === 0 && !payment) {
    return (
      <Card className="py-12 text-center">
        <p className="text-muted-foreground">Košarica je prazna.</p>
        <Link href="/proizvodi" className={buttonVariants({ className: 'mt-6' })}>
          Pogledaj proizvode
        </Link>
      </Card>
    );
  }

  const method = shippingMethods.find((m) => m.id === shippingMethodId);
  const isPickup = method?.type === 'pickup';
  const subtotal = cartSubtotalCents(items);
  const shipping = method ? shippingCostCents(method, subtotal) : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createOrder({
        email,
        phone,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingMethodId,
        shippingAddress,
        billingSameAsShipping: billingSame && !isPickup,
        billingAddress,
        note,
        acceptTerms,
        saveAddress,
      });
      if (result.ok) {
        setPayment(result);
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  const summary = (
    <Card className="h-fit space-y-3">
      <h2 className="font-semibold">Sažetak narudžbe</h2>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.key} className="flex justify-between gap-3">
            <span>
              {i.quantity} × {i.name}
              {i.variantName && <span className="text-muted-foreground"> ({i.variantName})</span>}
            </span>
            <span className="shrink-0">{formatPrice(i.priceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span>Međuzbroj</span>
          <span>{formatPrice(payment?.subtotalCents ?? subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Dostava{method ? ` (${method.name})` : ''}</span>
          <span>{formatPrice(payment?.shippingCents ?? shipping)}</span>
        </div>
        {method?.free_over_cents != null && subtotal < method.free_over_cents && (
          <p className="text-xs text-muted-foreground">
            Besplatna dostava za narudžbe od {formatPrice(method.free_over_cents)}.
          </p>
        )}
      </div>
      <div className="flex justify-between border-t pt-3 font-semibold">
        <span>Ukupno</span>
        <span>{formatPrice(payment?.totalCents ?? subtotal + shipping)}</span>
      </div>
    </Card>
  );

  if (payment) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Plaćanje — narudžba #{payment.orderNumber}</h2>
            <Button variant="link" size="sm" onClick={() => setPayment(null)}>
              Uredi podatke
            </Button>
          </div>
          <Elements
            stripe={getStripePromise()}
            options={{ clientSecret: payment.clientSecret, locale: 'hr', appearance: { theme: 'stripe' } }}
          >
            <PaymentStep orderId={payment.orderId} totalCents={payment.totalCents} />
          </Elements>
        </Card>
        {summary}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]" noValidate>
      <div className="space-y-6">
        {!stripeReady && (
          <FormMessage type="error">
            Stripe ključevi nisu postavljeni — naplata neće raditi dok ih ne dodate (vidi AGENT-SETUP.md).
          </FormMessage>
        )}

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Kontakt</h2>
            {!customer && (
              <p className="text-sm text-muted-foreground">
                Imate račun?{' '}
                <Link href="/prijava?next=/naplata" className="text-primary hover:underline">
                  Prijavite se
                </Link>
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail" htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
            </Field>
            <Field label="Telefon" htmlFor="phone">
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
              {fieldErrors.phone && <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>}
            </Field>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Način dostave</h2>
          {shippingMethods.length === 0 && (
            <FormMessage type="error">Trgovina još nema aktivnih načina dostave.</FormMessage>
          )}
          {shippingMethods.map((m) => {
            const cost = shippingCostCents(m, subtotal);
            return (
              <label
                key={m.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3',
                  m.id === shippingMethodId && 'border-primary ring-1 ring-primary',
                )}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={m.id}
                  checked={m.id === shippingMethodId}
                  onChange={() => setShippingMethodId(m.id)}
                  className="mt-1 accent-primary"
                />
                <span className="flex-1">
                  <span className="flex justify-between gap-3 font-medium">
                    {m.name}
                    <span>{cost === 0 ? 'Besplatno' : formatPrice(cost)}</span>
                  </span>
                  {m.description && <span className="block text-sm text-muted-foreground">{m.description}</span>}
                </span>
              </label>
            );
          })}
          {fieldErrors.shippingMethodId && (
            <p className="text-xs text-destructive">{fieldErrors.shippingMethodId}</p>
          )}
        </Card>

        {!isPickup && (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Adresa dostave</h2>
              {customer && customer.addresses.length > 0 && (
                <Select
                  aria-label="Spremljene adrese"
                  className="w-auto"
                  defaultValue={defaultAddress?.id}
                  onChange={(e) => {
                    const found = customer.addresses.find((a) => a.id === e.target.value);
                    if (found) setShippingAddress(toAddressInput(found));
                  }}
                >
                  {customer.addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}, {a.street}, {a.city}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <AddressFields prefix="shipping" value={shippingAddress} onChange={setShippingAddress} errors={fieldErrors} />
            {customer && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                Spremi adresu u moj račun
              </label>
            )}
          </Card>
        )}

        <Card className="space-y-4">
          <h2 className="font-semibold">Podaci za račun</h2>
          {!isPickup && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
              Isti kao adresa dostave
            </label>
          )}
          {(isPickup || !billingSame) && (
            <AddressFields prefix="billing" value={billingAddress} onChange={setBillingAddress} errors={fieldErrors} />
          )}
        </Card>

        <Card className="space-y-4">
          <Field label="Napomena uz narudžbu (nije obavezno)" htmlFor="note">
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" />
            <span>
              Pročitao/la sam i prihvaćam{' '}
              <Link href="/uvjeti-kupnje" target="_blank" className="text-primary underline">
                uvjete kupnje
              </Link>{' '}
              i{' '}
              <Link href="/privatnost" target="_blank" className="text-primary underline">
                pravila privatnosti
              </Link>
              .
            </span>
          </label>
          {fieldErrors.acceptTerms && <p className="text-xs text-destructive">{fieldErrors.acceptTerms}</p>}
        </Card>

        {error && <FormMessage type="error">{error}</FormMessage>}
      </div>

      <div className="space-y-4">
        {summary}
        <Button type="submit" size="lg" className="w-full" disabled={pending || shippingMethods.length === 0}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Nastavi na plaćanje
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Sigurno plaćanje karticom putem Stripea.
        </p>
      </div>
    </form>
  );
}
