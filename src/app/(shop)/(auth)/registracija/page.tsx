import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard, safeNextParam } from '@/components/auth/auth-card';
import { SignupForm } from '@/components/auth/auth-forms';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Registracija', robots: { index: false } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNextParam((await searchParams).next);
  const { user } = await getUser();
  if (user) redirect(next);

  return (
    <AuthCard title="Izrada računa" description="Brža kupnja, povijest narudžbi i spremljene adrese.">
      <SignupForm next={next} />
    </AuthCard>
  );
}
