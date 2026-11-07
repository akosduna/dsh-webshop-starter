import crypto from 'crypto';
import { siteUrl } from '@/lib/env';

/**
 * Guest access to an order (success page, payment slip, barcode): every
 * order has a random access_token. It travels in the link we show / e-mail
 * and in an httpOnly cookie set at checkout. Logged-in owners and admins
 * don't need it.
 */

export const ORDER_ACCESS_COOKIE_PREFIX = 'shop_order_';
export const ORDER_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function orderAccessCookieName(orderId: string): string {
  return `${ORDER_ACCESS_COOKIE_PREFIX}${orderId}`;
}

export function tokensMatch(expected: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type OrderViewer = { userId: string | null; isAdmin: boolean; tokens: (string | null | undefined)[] };

export function canViewOrder(
  order: { user_id: string | null; access_token: string },
  viewer: OrderViewer,
): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.userId && order.user_id === viewer.userId) return true;
  return viewer.tokens.some((token) => tokensMatch(order.access_token, token));
}

export function orderPublicPath(order: { id: string; access_token: string }): string {
  return `/naplata/uspjeh?order=${order.id}&t=${encodeURIComponent(order.access_token)}`;
}

export function orderPublicUrl(order: { id: string; access_token: string }): string {
  return `${siteUrl()}${orderPublicPath(order)}`;
}

export function orderBarcodePath(order: { id: string; access_token: string }): string {
  return `/api/orders/${order.id}/barcode?t=${encodeURIComponent(order.access_token)}`;
}

export function orderBarcodeUrl(order: { id: string; access_token: string }): string {
  return `${siteUrl()}${orderBarcodePath(order)}`;
}
