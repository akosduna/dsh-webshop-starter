import 'server-only';

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { userRoles } from '@/db/schema';
import { isMissingRelationError } from '@/db/utils';

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const rows = await getDb()
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.user_id, userId), eq(userRoles.role, 'admin')))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    // user_roles is created by the Drizzle migrations; before they run nobody is admin.
    if (isMissingRelationError(error)) return false;
    throw error;
  }
}

export async function assignRole(userId: string, role: string): Promise<void> {
  await getDb().insert(userRoles).values({ user_id: userId, role }).onConflictDoNothing();
}
