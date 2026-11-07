'use client';

import { useActionState } from 'react';
import { Field, FormMessage, Input } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateProfile } from '@/app/(shop)/moj-racun/actions';

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail" htmlFor="email">
        <Input id="email" value={email} disabled />
      </Field>
      <Field label="Ime i prezime" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={fullName} autoComplete="name" />
      </Field>
      <Field label="Telefon" htmlFor="phone">
        <Input id="phone" name="phone" defaultValue={phone} autoComplete="tel" />
      </Field>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      {state?.success && <FormMessage type="success">{state.success}</FormMessage>}
      <SubmitButton pendingText="Spremanje…">Spremi</SubmitButton>
    </form>
  );
}
