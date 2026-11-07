import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard, safeRedirectParam } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/auth-forms';
import { FormMessage } from '@/components/ui/form';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = { title: 'Prijava', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirectParam(params);
  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return (
    <AuthCard title="Prijava" description="Prijavite se za pregled narudžbi i spremljenih adresa.">
      {params.lozinka === 'promijenjena' && (
        <FormMessage type="success">Lozinka je promijenjena. Prijavite se novom lozinkom.</FormMessage>
      )}
      <LoginForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
