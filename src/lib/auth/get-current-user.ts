import 'server-only';

import { headers } from 'next/headers';
import { auth } from './auth';
import { isAdminEmail } from './admin-emails';
import { assignRole, isAdmin } from './roles';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: 'admin' | 'customer';
  isAdmin: boolean;
};

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

interface CachedAuthSessionEntry {
  expiresAt: number;
  session: NonNullable<AuthSession>;
}

declare global {
  var __authSessionFallbackCache: Map<string, CachedAuthSessionEntry> | undefined;
}

const AUTH_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const authSessionFallbackCache =
  globalThis.__authSessionFallbackCache ?? new Map<string, CachedAuthSessionEntry>();

if (!globalThis.__authSessionFallbackCache) {
  globalThis.__authSessionFallbackCache = authSessionFallbackCache;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function cleanupExpiredCachedSessions() {
  const now = Date.now();

  for (const [cookieHeader, entry] of authSessionFallbackCache.entries()) {
    if (entry.expiresAt <= now) {
      authSessionFallbackCache.delete(cookieHeader);
    }
  }
}

/**
 * Session lookup with 3 attempts and a 5-minute fallback cache keyed by the
 * raw Cookie header, so a transient database cold start doesn't log people out.
 */
export async function getAuthSession() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie') ?? '';

  cleanupExpiredCachedSessions();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const session = await auth.api.getSession({
        headers: requestHeaders,
      });

      if (cookieHeader) {
        if (session?.user?.email) {
          authSessionFallbackCache.set(cookieHeader, {
            expiresAt: Date.now() + AUTH_SESSION_CACHE_TTL_MS,
            session,
          });
        } else {
          authSessionFallbackCache.delete(cookieHeader);
        }
      }

      return session;
    } catch (error) {
      if (attempt === 3) {
        const cachedSession = cookieHeader
          ? (authSessionFallbackCache.get(cookieHeader)?.session ?? null)
          : null;

        if (cachedSession?.user?.email) {
          console.warn('Using cached auth session after transient lookup failure.');
          return cachedSession;
        }

        console.error('Auth session lookup failed:', error);
        return null;
      }

      await wait(attempt * 200);
    }
  }

  return null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getAuthSession();
  const user = session?.user ?? null;

  if (!user) return null;

  let admin = await isAdmin(user.id);
  if (!admin && isAdminEmail(user.email)) {
    await assignRole(user.id, 'admin');
    admin = true;
  }

  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email,
    image: user.image ?? null,
    role: admin ? 'admin' : 'customer',
    isAdmin: admin,
  };
}
