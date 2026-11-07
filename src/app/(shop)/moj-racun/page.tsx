import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { FormMessage } from '@/components/ui/form';
import { ProfileForm } from '@/components/account/profile-form';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Moj račun', robots: { index: false } };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, supabase } = await requireUser('/moj-racun');
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle();
  const passwordChanged = (await searchParams).lozinka === 'promijenjena';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profil</h1>
      {passwordChanged && <FormMessage type="success">Lozinka je promijenjena.</FormMessage>}
      <Card className="max-w-lg">
        <ProfileForm fullName={profile?.full_name ?? ''} phone={profile?.phone ?? ''} email={user.email ?? ''} />
      </Card>
    </div>
  );
}
