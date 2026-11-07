import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/auth-forms';
import { FormMessage } from '@/components/ui/form';

export const metadata: Metadata = { title: 'Nova lozinka', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Landing page of the reset e-mail link: Better Auth redirects here with ?token= (or ?error=INVALID_TOKEN). */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';

  return (
    <AuthCard title="Nova lozinka" description="Odaberite novu lozinku za svoj račun.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <FormMessage type="error">Poveznica je istekla ili je neispravna.</FormMessage>
          <Link href="/zaboravljena-lozinka" className="text-sm text-primary hover:underline">
            Zatraži novu poveznicu
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
