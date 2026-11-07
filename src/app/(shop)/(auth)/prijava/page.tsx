import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard, safeNextParam } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/auth-forms';
import { FormMessage } from '@/components/ui/form';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Prijava', robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextParam(params.next);
  const { user } = await getUser();
  if (user) redirect(next);

  return (
    <AuthCard title="Prijava" description="Prijavite se za pregled narudžbi i spremljenih adresa.">
      {params.greska === 'poveznica' && (
        <FormMessage type="error">Poveznica je istekla ili je neispravna. Pokušajte ponovno.</FormMessage>
      )}
      <LoginForm next={next} />
    </AuthCard>
  );
}
