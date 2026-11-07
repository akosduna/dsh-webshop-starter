/**
 * Day-one safety: before `drizzle-kit migrate` runs, every table query fails
 * with 42P01 (relation does not exist). Pages that must still render (home,
 * admin dashboard) wrap reads in these helpers and show empty states.
 */
export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const causeCode = (error as { cause?: { code?: string } }).cause?.code;
  return code === '42P01' || causeCode === '42P01';
}

type PgErrorLike = { code?: string; constraint?: string; message?: string };

/** The pg driver error, also when Drizzle wraps it (DrizzleQueryError.cause). */
function pgError(error: unknown): PgErrorLike | null {
  if (!error || typeof error !== 'object') return null;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === 'object' && 'code' in cause) return cause as PgErrorLike;
  return 'code' in error ? (error as PgErrorLike) : null;
}

/** 23505 unique violation, optionally on a constraint whose name contains `hint`. */
export function isUniqueViolation(error: unknown, hint?: string): boolean {
  const pg = pgError(error);
  if (pg?.code !== '23505') return false;
  return !hint || (pg.constraint ?? pg.message ?? '').includes(hint);
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (isMissingRelationError(error)) return true;
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const causeCode = (error as { cause?: { code?: string } }).cause?.code;
  return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '3D000', '28P01'].some(
    (c) => c === code || c === causeCode,
  );
}

export async function safeQuery<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const pg = pgError(error);
      console.error(
        `[db] ${label}: database not ready (${pg?.code ?? 'unknown'}: ${pg?.message ?? String(error)}) — see DATABASE-SETUP.md`,
      );
      return fallback;
    }
    throw error;
  }
}
