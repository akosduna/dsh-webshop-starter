/** Public origin of the shop, without a trailing slash. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/** True for empty values and the placeholders used in .env.example. */
export function isPlaceholderValue(value: string | undefined | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return /REPLACE_ME|^your_/i.test(v);
}

export function envValue(name: string): string | undefined {
  const value = process.env[name];
  return isPlaceholderValue(value) ? undefined : value!.trim();
}
