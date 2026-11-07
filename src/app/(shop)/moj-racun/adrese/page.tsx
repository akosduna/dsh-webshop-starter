import type { Metadata } from 'next';
import { AddressManager } from '@/components/account/address-manager';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Adrese', robots: { index: false } };

export default async function AddressesPage() {
  const { user, supabase } = await requireUser('/moj-racun/adrese');
  const { data: addresses } = await supabase
    .from('addresses')
    .select('id, full_name, company, street, city, postal_code, country, phone, is_default')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Adrese</h1>
      <AddressManager addresses={addresses ?? []} />
    </div>
  );
}
