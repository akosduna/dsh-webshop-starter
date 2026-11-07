import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { addresses, customerProfiles } from '@/db/schema';

export async function getCustomerPhone(userId: string): Promise<string> {
  const row = await getDb().query.customerProfiles.findFirst({
    where: eq(customerProfiles.user_id, userId),
    columns: { phone: true },
  });
  return row?.phone ?? '';
}

export async function listAddresses(userId: string) {
  return getDb()
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, userId))
    .orderBy(desc(addresses.is_default), desc(addresses.created_at));
}

export async function getAddress(userId: string, addressId: string) {
  const [row] = await getDb()
    .select()
    .from(addresses)
    .where(and(eq(addresses.user_id, userId), eq(addresses.id, addressId)))
    .limit(1);
  return row ?? null;
}
