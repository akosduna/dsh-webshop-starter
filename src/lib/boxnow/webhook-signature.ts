import { createHmac, timingSafeEqual } from 'crypto';

function matches(secret: string, value: string, given: string): boolean {
  const hmac = createHmac('sha256', secret).update(value).digest();
  return [hmac.toString('hex'), hmac.toString('base64')].some((candidate) => {
    const left = Buffer.from(candidate);
    const right = Buffer.from(given);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

/**
 * BOX NOW webhook auth: `datasignature` is HMAC-SHA256 (hex or base64) with
 * the webhook secret, over the raw body or over JSON.stringify(data).
 */
export function verifyBoxNowSignature(secret: string, rawBody: string, payload: { datasignature?: string; data?: unknown }): boolean {
  const given = payload.datasignature || '';
  if (!given) return false;
  return matches(secret, rawBody, given) || matches(secret, JSON.stringify(payload.data ?? {}), given);
}
