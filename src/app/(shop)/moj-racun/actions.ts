'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

export type FormState = { error?: string; success?: string } | null;

function text(formData: FormData, key: string, max = 200): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireUser('/moj-racun');
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: text(formData, 'full_name') || null, phone: text(formData, 'phone', 40) || null })
    .eq('id', user.id);
  if (error) return { error: 'Spremanje nije uspjelo.' };
  revalidatePath('/moj-racun');
  return { success: 'Podaci su spremljeni.' };
}

export async function saveAddress(_: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireUser('/moj-racun/adrese');
  const address = {
    full_name: text(formData, 'full_name'),
    company: text(formData, 'company') || null,
    street: text(formData, 'street'),
    city: text(formData, 'city', 100),
    postal_code: text(formData, 'postal_code', 20),
    country: text(formData, 'country', 2).toUpperCase() || 'HR',
    phone: text(formData, 'phone', 40) || null,
  };
  if (!address.full_name || !address.street || !address.city || !address.postal_code) {
    return { error: 'Ispunite ime, ulicu, poštanski broj i grad.' };
  }

  const id = text(formData, 'id');
  const { count } = await supabase
    .from('addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { error } = id
    ? await supabase.from('addresses').update(address).eq('id', id).eq('user_id', user.id)
    : await supabase.from('addresses').insert({ ...address, user_id: user.id, is_default: !count });
  if (error) return { error: 'Adresu nije moguće spremiti.' };

  revalidatePath('/moj-racun/adrese');
  return { success: 'Adresa je spremljena.' };
}

export async function deleteAddress(id: string) {
  const { user, supabase } = await requireUser('/moj-racun/adrese');
  await supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/moj-racun/adrese');
}

export async function setDefaultAddress(id: string) {
  const { user, supabase } = await requireUser('/moj-racun/adrese');
  await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
  await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/moj-racun/adrese');
}
