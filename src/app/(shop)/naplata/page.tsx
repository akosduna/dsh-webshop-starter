import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getCurrentUser } from '@/lib/auth/server';
import { envValue } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { getCheckoutShippingMethods, getPaymentOptions } from '@/lib/shop/checkout-options';
import { getCustomerPhone, listAddresses } from '@/lib/shop/customer';
import { stripePublishableKey } from '@/lib/stripe/server';

export const metadata: Metadata = { title: 'Naplata', robots: { index: false } };
export const dynamic = 'force-dynamic';

async function loadCustomer() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [phone, addresses] = await Promise.all([getCustomerPhone(user.id), listAddresses(user.id)]);
  return {
    email: user.email,
    fullName: user.name,
    phone,
    addresses: addresses.map((a) => ({
      id: a.id,
      full_name: a.full_name,
      company: a.company,
      street: a.street,
      city: a.city,
      postal_code: a.postal_code,
      country: a.country,
      phone: a.phone,
      is_default: a.is_default,
    })),
  };
}

export default async function CheckoutPage() {
  const [shippingMethods, customer] = await Promise.all([getCheckoutShippingMethods(), loadCustomer()]);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Naplata</h1>
      <CheckoutForm
        shippingMethods={shippingMethods}
        paymentOptions={getPaymentOptions()}
        customer={customer}
        stripePublishableKey={stripePublishableKey()}
        boxNowPartnerId={isModuleReady('boxnow') ? (envValue('BOXNOW_PARTNER_ID') ?? null) : null}
      />
    </div>
  );
}
