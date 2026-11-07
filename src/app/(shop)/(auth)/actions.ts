'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/env';

export type AuthState = { error?: string; success?: string } | null;

/** Only allow same-site relative redirects (prevents open redirects). */
function safeNext(value: FormDataEntryValue | null, fallback = '/moj-racun'): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(formData, 'email'),
    password: String(formData.get('password') ?? ''),
  });
  if (error) {
    return {
      error:
        error.code === 'email_not_confirmed'
          ? 'E-mail adresa još nije potvrđena. Provjerite poštu.'
          : 'Neispravan e-mail ili lozinka.',
    };
  }
  redirect(safeNext(formData.get('next')));
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'Lozinka mora imati barem 8 znakova.' };

  const supabase = await createClient();
  const next = safeNext(formData.get('next'));
  const { data, error } = await supabase.auth.signUp({
    email: text(formData, 'email'),
    password,
    options: {
      data: { full_name: text(formData, 'full_name') },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return {
      error:
        error.code === 'user_already_exists'
          ? 'Račun s ovom e-mail adresom već postoji.'
          : `Registracija nije uspjela: ${error.message}`,
    };
  }
  // With e-mail confirmation turned off Supabase logs the user in right away.
  if (data.session) redirect(next);
  return { success: 'Poslali smo vam e-mail s poveznicom za potvrdu računa.' };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(text(formData, 'email'), {
    redirectTo: `${siteUrl()}/auth/callback?next=/nova-lozinka`,
  });
  // Same answer whether or not the account exists.
  return { success: 'Ako račun postoji, poslali smo e-mail s poveznicom za novu lozinku.' };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'Lozinka mora imati barem 8 znakova.' };
  if (password !== String(formData.get('password_confirm') ?? '')) {
    return { error: 'Lozinke se ne podudaraju.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: 'Lozinku nije moguće promijeniti. Zatražite novu poveznicu.' };
  }
  redirect('/moj-racun?lozinka=promijenjena');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
