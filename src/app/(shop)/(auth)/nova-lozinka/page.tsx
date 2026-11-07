import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/auth-forms';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Nova lozinka', robots: { index: false } };

export default async function ResetPasswordPage() {
  // The e-mail link logs the user in via /auth/callback before landing here.
  await requireUser('/nova-lozinka');
  return (
    <AuthCard title="Nova lozinka" description="Odaberite novu lozinku za svoj račun.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
