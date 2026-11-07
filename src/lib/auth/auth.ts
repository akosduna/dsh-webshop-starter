import '../neon-config';

import { Pool as NeonPool } from '@neondatabase/serverless';
import { betterAuth } from 'better-auth';
import { Pool as PgPool } from 'pg';
import { normalizePgConnectionString } from '@/lib/db-connection';
import { sendPasswordResetEmail } from '@/lib/email/auth-emails';

/**
 * Better Auth (email + password) on the shop's Postgres database.
 *
 * AUTH CONTRACT (see AGENTS.md): Better Auth gets its own direct Pool — never
 * the Drizzle adapter — and `auth` stays a direct export. The resilience
 * layers (neon-config fetch retry, route retry, client retry, session
 * fallback cache) are intentional; do not remove them one by one.
 */

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error('DATABASE_URL env var is required — see DATABASE-SETUP.md');
}

const connectionString = normalizePgConnectionString(rawConnectionString);

// Canonical name is BETTER_AUTH_SECRET; NEON_AUTH_COOKIE_SECRET is the legacy alias.
const authSecret = process.env.BETTER_AUTH_SECRET || process.env.NEON_AUTH_COOKIE_SECRET;
if (!authSecret) {
  throw new Error(
    'BETTER_AUTH_SECRET env var is required — see .env.example (legacy alias: NEON_AUTH_COOKIE_SECRET).',
  );
}

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type BetterAuthPool = PgPool | NeonPool;

declare global {
  var __betterAuthPool: BetterAuthPool | undefined;
}

function createBetterAuthPool(): BetterAuthPool {
  const poolConfig = {
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  // Allow an explicit opt-in fallback for environments where direct pg TCP
  // connectivity is unavailable, but keep pg as the default/auth parity path.
  if (process.env.USE_NEON_SERVERLESS_AUTH_POOL === 'true') {
    return new NeonPool(poolConfig);
  }

  return new PgPool(poolConfig);
}

const shouldCachePool = process.env.NODE_ENV !== 'production';
const pool =
  shouldCachePool && globalThis.__betterAuthPool
    ? globalThis.__betterAuthPool
    : createBetterAuthPool();

if (shouldCachePool) {
  globalThis.__betterAuthPool = pool;
}

/**
 * Better Auth rejects sign-in / sign-up requests whose Origin header is not in
 * `trustedOrigins`. A Vercel deployment answers on several hostnames at once
 * (production alias, branch alias, per-deploy alias, custom domains), so:
 *   1. NEXT_PUBLIC_APP_URL + localhost for dev
 *   2. Vercel runtime hostnames (VERCEL_URL, VERCEL_BRANCH_URL, VERCEL_PROJECT_PRODUCTION_URL)
 *   3. `https://*.vercel.app` wildcard (SameSite=Lax cookies still block cross-site CSRF)
 *   4. ADDITIONAL_TRUSTED_ORIGINS for extra custom domains
 */
function buildTrustedOrigins(): string[] {
  const origins = new Set<string>([
    appUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://*.vercel.app',
  ]);

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    origins.add(`https://${process.env.VERCEL_BRANCH_URL}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  if (process.env.ADDITIONAL_TRUSTED_ORIGINS) {
    for (const origin of process.env.ADDITIONAL_TRUSTED_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return Array.from(origins);
}

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail(user.email, url);
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
  secret: authSecret,
  baseURL: appUrl,
  basePath: '/api/auth',
  trustedOrigins: buildTrustedOrigins(),
});
