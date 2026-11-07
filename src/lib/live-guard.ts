/**
 * Guard for real-world side effects (customer e-mails, GLS / BOX NOW parcels).
 *
 * Preview deploys and local dev often share live credentials with production,
 * so a test there could create a real parcel or e-mail a real customer. Side
 * effects are therefore only allowed on the Vercel production deploy, or when
 * ALLOW_LIVE_SIDE_EFFECTS=true is set explicitly (never set it on Preview).
 * Carrier test environments (GLS_MODE=test) are always allowed.
 */
export function liveSideEffectsAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.ALLOW_LIVE_SIDE_EFFECTS === 'true') return true;
  return env.VERCEL_ENV === 'production';
}

/** Addresses that may still receive e-mail outside production (comma-separated PREVIEW_EMAIL_ALLOWLIST). */
export function previewEmailAllowlist(): string[] {
  return (process.env.PREVIEW_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
}

export function emailAllowed(recipient: string): boolean {
  if (liveSideEffectsAllowed()) return true;
  return previewEmailAllowlist().includes(recipient.trim().toLowerCase());
}

export const PREVIEW_BLOCKED_MESSAGE =
  'Testno okruženje: stvarno slanje je isključeno (radi samo na produkciji).';
