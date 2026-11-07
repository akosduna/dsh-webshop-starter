import type { Metadata } from 'next';
import { AddressManager } from '@/components/account/address-manager';
import { requireUser } from '@/lib/auth/server';
import { listAddresses } from '@/lib/shop/customer';

export const metadata: Metadata = { title: 'Adrese', robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser('/moj-racun/adrese');
  const rows = await listAddresses(user.id);
  const addresses = rows.map(({ id, full_name, company, street, city, postal_code, country, phone, is_default }) => ({
    id,
    full_name,
    company,
    street,
    city,
    postal_code,
    country,
    phone,
    is_default,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Adrese</h1>
      <AddressManager addresses={addresses} />
    </div>
  );
}
