import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'Zaboravljena lozinka', robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Zaboravljena lozinka"
      description="Upišite e-mail i poslat ćemo vam poveznicu za postavljanje nove lozinke."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
