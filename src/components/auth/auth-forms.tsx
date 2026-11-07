'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormMessage, Input } from '@/components/ui/form';
import { authClient, signInWithRetry, signUpWithRetry } from '@/lib/auth/client';

type AuthError = { code?: string; message?: string; status?: number } | null | undefined;

/** Better Auth error → Croatian message. */
function authErrorMessage(error: AuthError, fallback: string): string {
  switch (error?.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Neispravan e-mail ili lozinka.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Račun s ovom e-mail adresom već postoji.';
    case 'PASSWORD_TOO_SHORT':
      return 'Lozinka mora imati barem 8 znakova.';
    case 'INVALID_EMAIL':
      return 'Upišite ispravnu e-mail adresu.';
    case 'INVALID_TOKEN':
      return 'Poveznica je istekla ili je neispravna. Zatražite novu.';
    case 'RESET_PASSWORD_DISABLED':
      return 'Promjena lozinke e-mailom trenutno nije moguća. Javite nam se.';
    default:
      if (error?.status === 429) return 'Previše pokušaja. Pričekajte minutu pa pokušajte ponovno.';
      return fallback;
  }
}

function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(task: () => Promise<string | null>) {
    setPending(true);
    setError(null);
    try {
      const message = await task();
      if (message) setError(message);
    } catch {
      setError('Veza s poslužiteljem nije uspjela. Pokušajte ponovno.');
    } finally {
      setPending(false);
    }
  }
  return { pending, error, run };
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

/** Full navigation so server components and the proxy see the new session cookie. */
function goTo(path: string) {
  window.location.assign(path);
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { pending, error, run } = useSubmit();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void run(async () => {
      const result = await signInWithRetry({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      if (result.error) return authErrorMessage(result.error, 'Prijava nije uspjela. Pokušajte ponovno.');
      goTo(redirectTo);
      return null;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Lozinka" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <SubmitButton pending={pending}>Prijava</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/zaboravljena-lozinka" className="text-primary hover:underline">
          Zaboravljena lozinka?
        </Link>
        <Link href={`/registracija?redirect=${encodeURIComponent(redirectTo)}`} className="text-primary hover:underline">
          Izradi račun
        </Link>
      </div>
    </form>
  );
}

export function SignupForm({ redirectTo }: { redirectTo: string }) {
  const { pending, error, run } = useSubmit();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    void run(async () => {
      if (password.length < 8) return 'Lozinka mora imati barem 8 znakova.';
      const result = await signUpWithRetry({
        name: String(form.get('full_name') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password,
      });
      if (result.error) return authErrorMessage(result.error, 'Registracija nije uspjela. Pokušajte ponovno.');
      goTo(redirectTo);
      return null;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Ime i prezime" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Lozinka" htmlFor="password" hint="Najmanje 8 znakova.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <SubmitButton pending={pending}>Izradi račun</SubmitButton>
      <p className="text-center text-sm">
        Već imate račun?{' '}
        <Link href={`/prijava?redirect=${encodeURIComponent(redirectTo)}`} className="text-primary hover:underline">
          Prijavite se
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { pending, error, run } = useSubmit();
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void run(async () => {
      const result = await authClient.requestPasswordReset({
        email: String(form.get('email') ?? '').trim(),
        redirectTo: '/nova-lozinka',
      });
      if (result.error) return authErrorMessage(result.error, 'Slanje nije uspjelo. Pokušajte ponovno.');
      setSent(true);
      return null;
    });
  }

  if (sent) {
    // Same answer whether or not the account exists.
    return <FormMessage type="success">Ako račun postoji, poslali smo e-mail s poveznicom za novu lozinku.</FormMessage>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <SubmitButton pending={pending}>Pošalji poveznicu</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { pending, error, run } = useSubmit();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    void run(async () => {
      if (password.length < 8) return 'Lozinka mora imati barem 8 znakova.';
      if (password !== String(form.get('password_confirm') ?? '')) return 'Lozinke se ne podudaraju.';
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) return authErrorMessage(result.error, 'Lozinku nije moguće promijeniti. Zatražite novu poveznicu.');
      goTo('/prijava?lozinka=promijenjena');
      return null;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nova lozinka" htmlFor="password" hint="Najmanje 8 znakova.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Ponovite lozinku" htmlFor="password_confirm">
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required />
      </Field>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <SubmitButton pending={pending}>Spremi lozinku</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const { pending, error, run } = useSubmit();
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get('new_password') ?? '');
    setDone(false);
    void run(async () => {
      if (newPassword.length < 8) return 'Nova lozinka mora imati barem 8 znakova.';
      const result = await authClient.changePassword({
        currentPassword: String(form.get('current_password') ?? ''),
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        return result.error.code === 'INVALID_PASSWORD'
          ? 'Trenutna lozinka nije ispravna.'
          : authErrorMessage(result.error, 'Lozinku nije moguće promijeniti.');
      }
      formElement.reset();
      setDone(true);
      return null;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Trenutna lozinka" htmlFor="current_password">
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Nova lozinka" htmlFor="new_password" hint="Najmanje 8 znakova.">
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error && <FormMessage type="error">{error}</FormMessage>}
      {done && <FormMessage type="success">Lozinka je promijenjena.</FormMessage>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Promijeni lozinku
      </Button>
    </form>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await authClient.signOut();
        } finally {
          goTo('/');
        }
      }}
    >
      Odjava
    </Button>
  );
}
