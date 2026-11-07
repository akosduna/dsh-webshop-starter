/**
 * Upgrades sslmode prefer / require / verify-ca to verify-full.
 * Keep the current secure behavior explicit and silence pg's upgrade warning.
 * Local URLs without sslmode (Docker Postgres) are left untouched.
 */
export function normalizePgConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');

    if (sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca') {
      url.searchParams.set('sslmode', 'verify-full');
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL env var is required — see DATABASE-SETUP.md');
  }
  return normalizePgConnectionString(url);
}
