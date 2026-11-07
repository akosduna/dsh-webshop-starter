import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/auth-forms';
import { FormMessage } from '@/components/ui/form';
import { isModuleReady } from '@/lib/modules';
import { getStoreSettings } from '@/lib/shop/catalog';

export const metadata: Metadata = { title: 'Zaboravljena lozinka', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  // The reset link goes out by e-mail (Resend, module "order_emails").
  if (!isModuleReady('order_emails')) {
    const settings = await getStoreSettings();
    return (
      <AuthCard title="Zaboravljena lozinka">
        <FormMessage type="error">
          Slanje e-maila za novu lozinku trenutno nije uključeno. Javite nam se
          {settings?.contact_email ? ` na ${settings.contact_email}` : ''} i pomoći ćemo vam.
        </FormMessage>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Zaboravljena lozinka"
      description="Upišite e-mail i poslat ćemo vam poveznicu za postavljanje nove lozinke."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
