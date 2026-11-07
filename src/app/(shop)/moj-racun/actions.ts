'use server';

import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getDb } from '@/db';
import { addresses, customerProfiles } from '@/db/schema';
import { auth } from '@/lib/auth/auth';
import { requireUser } from '@/lib/auth/server';

export type FormState = { error?: string; success?: string } | null;

function text(formData: FormData, key: string, max = 200): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser('/moj-racun');
  const name = text(formData, 'full_name');
  const phone = text(formData, 'phone', 40) || null;
  try {
    if (name && name !== user.name) {
      await auth.api.updateUser({ headers: await headers(), body: { name } });
    }
    await getDb()
      .insert(customerProfiles)
      .values({ user_id: user.id, phone })
      .onConflictDoUpdate({ target: customerProfiles.user_id, set: { phone } });
  } catch (error) {
    console.error('[account] profile update', error instanceof Error ? error.message : error);
    return { error: 'Spremanje nije uspjelo.' };
  }
  revalidatePath('/moj-racun');
  return { success: 'Podaci su spremljeni.' };
}

export async function saveAddress(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser('/moj-racun/adrese');
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

  const db = getDb();
  const id = text(formData, 'id');
  try {
    if (id) {
      await db
        .update(addresses)
        .set(address)
        .where(and(eq(addresses.id, id), eq(addresses.user_id, user.id)));
    } else {
      const [{ total }] = await db.select({ total: count() }).from(addresses).where(eq(addresses.user_id, user.id));
      await db.insert(addresses).values({ ...address, user_id: user.id, is_default: total === 0 });
    }
  } catch (error) {
    console.error('[account] save address', error instanceof Error ? error.message : error);
    return { error: 'Adresu nije moguće spremiti.' };
  }

  revalidatePath('/moj-racun/adrese');
  return { success: 'Adresa je spremljena.' };
}

export async function deleteAddress(id: string) {
  const user = await requireUser('/moj-racun/adrese');
  await getDb()
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.user_id, user.id)));
  revalidatePath('/moj-racun/adrese');
}

export async function setDefaultAddress(id: string) {
  const user = await requireUser('/moj-racun/adrese');
  await getDb().transaction(async (tx) => {
    await tx.update(addresses).set({ is_default: false }).where(eq(addresses.user_id, user.id));
    await tx
      .update(addresses)
      .set({ is_default: true })
      .where(and(eq(addresses.id, id), eq(addresses.user_id, user.id)));
  });
  revalidatePath('/moj-racun/adrese');
}
