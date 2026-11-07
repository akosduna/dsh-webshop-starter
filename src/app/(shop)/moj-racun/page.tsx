import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { ChangePasswordForm } from '@/components/auth/auth-forms';
import { ProfileForm } from '@/components/account/profile-form';
import { requireUser } from '@/lib/auth/server';
import { getCustomerPhone } from '@/lib/shop/customer';

export const metadata: Metadata = { title: 'Moj račun', robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser('/moj-racun');
  const phone = await getCustomerPhone(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <Card className="max-w-lg">
        <ProfileForm fullName={user.name} phone={phone} email={user.email} />
      </Card>
      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold">Promjena lozinke</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
