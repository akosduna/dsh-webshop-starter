'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Field, FormMessage, Input } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  login,
  requestPasswordReset,
  signup,
  updatePassword,
} from '@/app/(shop)/(auth)/actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Lozinka" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      <SubmitButton className="w-full" pendingText="Prijava…">
        Prijava
      </SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/zaboravljena-lozinka" className="text-primary hover:underline">
          Zaboravljena lozinka?
        </Link>
        <Link href={`/registracija?next=${encodeURIComponent(next)}`} className="text-primary hover:underline">
          Izradi račun
        </Link>
      </div>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signup, null);
  if (state?.success) return <FormMessage type="success">{state.success}</FormMessage>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Ime i prezime" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Lozinka" htmlFor="password" hint="Najmanje 8 znakova.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      <SubmitButton className="w-full" pendingText="Izrada računa…">
        Izradi račun
      </SubmitButton>
      <p className="text-center text-sm">
        Već imate račun?{' '}
        <Link href={`/prijava?next=${encodeURIComponent(next)}`} className="text-primary hover:underline">
          Prijavite se
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  if (state?.success) return <FormMessage type="success">{state.success}</FormMessage>;
  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      <SubmitButton className="w-full" pendingText="Slanje…">
        Pošalji poveznicu
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nova lozinka" htmlFor="password" hint="Najmanje 8 znakova.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Ponovite lozinku" htmlFor="password_confirm">
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      <SubmitButton className="w-full" pendingText="Spremanje…">
        Spremi lozinku
      </SubmitButton>
    </form>
  );
}
