import '../lib/neon-config';
import 'server-only';

import { Pool as NeonPool } from '@neondatabase/serverless';
import { attachDatabasePool } from '@vercel/functions';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import { getDatabaseUrl } from '@/lib/db-connection';
import * as schema from './schema';

/**
 * Shop database handle (Drizzle).
 *
 * Driver: `pg.Pool` by default — same as Better Auth, and it gives real
 * interactive transactions (order creation with stock reservation, paid
 * marking with SELECT … FOR UPDATE). It also works unchanged against a local
 * Docker Postgres. `USE_NEON_SERVERLESS_POOL=true` switches to the Neon
 * serverless Pool (WebSocket, also transactional) for environments without
 * direct TCP to Neon.
 *
 * The pool is created lazily on first query, so `next build` works without a
 * reachable database.
 */
export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

declare global {
  var __shopDb: Db | undefined;
}

function createDb(): Db {
  const poolConfig = {
    connectionString: getDatabaseUrl(),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  if (process.env.USE_NEON_SERVERLESS_POOL === 'true') {
    const pool = new NeonPool(poolConfig);
    attachDatabasePool(pool);
    // Both drivers expose the same query builder and transaction API.
    return drizzleNeon({ client: pool, schema }) as unknown as Db;
  }

  const pool = new PgPool(poolConfig);
  attachDatabasePool(pool);
  return drizzlePg({ client: pool, schema });
}

export function getDb(): Db {
  if (!globalThis.__shopDb) {
    globalThis.__shopDb = createDb();
  }
  return globalThis.__shopDb;
}

export { schema };
