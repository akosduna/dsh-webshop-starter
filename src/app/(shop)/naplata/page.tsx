import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getActiveShippingMethods } from '@/lib/shop/catalog';
import { getUser } from '@/lib/auth';
import { isStripeConfigured } from '@/lib/stripe/server';

export const metadata: Metadata = { title: 'Naplata', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const [shippingMethods, { user, supabase }] = await Promise.all([
    getActiveShippingMethods(),
    getUser(),
  ]);

  let profile: { full_name: string | null; phone: string | null } | null = null;
  let addresses: {
    id: string;
    full_name: string;
    company: string | null;
    street: string;
    city: string;
    postal_code: string;
    country: string;
    phone: string | null;
    is_default: boolean;
  }[] = [];

  if (user) {
    const [profileResult, addressResult] = await Promise.all([
      supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
      supabase
        .from('addresses')
        .select('id, full_name, company, street, city, postal_code, country, phone, is_default')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);
    profile = profileResult.data;
    addresses = addressResult.data ?? [];
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Naplata</h1>
      <CheckoutForm
        shippingMethods={shippingMethods}
        stripeReady={isStripeConfigured()}
        customer={
          user
            ? {
                email: user.email ?? '',
                fullName: profile?.full_name ?? '',
                phone: profile?.phone ?? '',
                addresses,
              }
            : null
        }
      />
    </div>
  );
}
