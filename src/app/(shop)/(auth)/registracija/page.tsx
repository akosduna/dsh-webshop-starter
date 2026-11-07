import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard, safeRedirectParam } from '@/components/auth/auth-card';
import { SignupForm } from '@/components/auth/auth-forms';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = { title: 'Registracija', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const redirectTo = safeRedirectParam(await searchParams);
  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return (
    <AuthCard title="Izrada računa" description="Brža kupnja, povijest narudžbi i spremljene adrese.">
      <SignupForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
