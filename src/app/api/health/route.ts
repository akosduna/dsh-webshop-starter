import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getAllModuleStatuses } from '@/lib/modules';

/**
 * Health check for deploy verification: env present/missing, database
 * reachable, Better Auth + shop tables present, module readiness.
 * Never returns secret values — only booleans, table names and counts.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AUTH_TABLES = ['user', 'session', 'account', 'verification'] as const;
const SHOP_TABLES = ['products', 'orders', 'shipping_methods', 'store_settings', 'user_roles'] as const;

type TableStatus = { present: boolean; rowCount?: number; error?: string };

async function checkTables(tables: readonly string[]): Promise<Record<string, TableStatus>> {
  const result: Record<string, TableStatus> = {};
  for (const table of tables) {
    try {
      const rows = await getDb().execute<{ c: number }>(sql.raw(`SELECT COUNT(*)::int AS c FROM "${table}"`));
      result[table] = { present: true, rowCount: rows.rows[0]?.c ?? 0 };
    } catch (err) {
      const code = (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
      result[table] = {
        present: false,
        error: code === '42P01' ? 'relation does not exist (42P01) — run npm run db:migrate' : 'query failed',
      };
    }
  }
  return result;
}

export async function GET() {
  const startedAt = Date.now();
  const authSecretPresent = Boolean(process.env.BETTER_AUTH_SECRET || process.env.NEON_AUTH_COOKIE_SECRET);
  const env = {
    DATABASE_URL: process.env.DATABASE_URL ? 'present' : 'missing',
    BETTER_AUTH_SECRET: authSecretPresent ? 'present' : 'missing',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? 'present' : 'missing',
    ADMIN_EMAILS: process.env.ADMIN_EMAILS ? 'present' : 'missing',
  };
  const errors: string[] = [];
  if (!process.env.DATABASE_URL) errors.push('DATABASE_URL missing');
  if (!authSecretPresent) errors.push('BETTER_AUTH_SECRET missing');

  let database = 'skipped';
  let authTables: Record<string, TableStatus> | string = 'skipped';
  let shopTables: Record<string, TableStatus> | string = 'skipped';

  if (process.env.DATABASE_URL) {
    try {
      await getDb().execute(sql`select 1`);
      database = 'ok';
      authTables = await checkTables(AUTH_TABLES);
      shopTables = await checkTables(SHOP_TABLES);
      const missing = [...Object.entries(authTables), ...Object.entries(shopTables)]
        .filter(([, v]) => !v.present)
        .map(([k]) => k);
      if (missing.length) errors.push(`tables missing: ${missing.join(', ')}`);
    } catch {
      database = 'error';
      errors.push('database connection failed');
    }
  }

  const ok = errors.length === 0;
  return NextResponse.json(
    {
      ok,
      app_url: process.env.NEXT_PUBLIC_APP_URL || null,
      durationMs: Date.now() - startedAt,
      checks: { env, database, authTables, shopTables },
      modules: getAllModuleStatuses().map((m) => ({ id: m.id, state: m.state, missingEnv: m.missingEnv })),
      errors: errors.length ? errors : undefined,
    },
    { status: ok ? 200 : 503 },
  );
}
