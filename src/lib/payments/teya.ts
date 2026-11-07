import crypto from 'crypto';

/**
 * Teya SecurePay (Borgun) hosted payment page.
 *
 * Docs:
 * - https://docs.borgun.is/hostedpayments/securepay/
 * - https://podrska.teya.com/hc/hr-hr/articles/29642942971793-Testno-okru%C5%BEenje
 *
 * Flow:
 *   1. The server builds a signed form (HMAC-SHA256 checkhash); the browser
 *      auto-submits it to TEYA_API_URL.
 *   2. The buyer pays on Teya's page (3-D Secure included).
 *   3. Teya redirects the browser (POST) to returnurlsuccess | cancel | error.
 *   4. Teya also POSTs server-to-server to returnurlsuccessserver — the
 *      confirmation that counts. Reply `<PaymentNotification>Accepted</PaymentNotification>`.
 *
 * Checkhash message:  MerchantId|ReturnUrlSuccess|ReturnUrlSuccessServer|OrderId|Amount|Currency
 * Orderhash message:  OrderId|Amount|Currency
 *
 * Teya quirks:
 *   - At least one item line (itemdescription_0 / itemcount_0 / itemunitamount_0 /
 *     itemamount_0) is required, even for a single total.
 *   - Return URLs cannot use localhost / 127.0.0.1; in dev they are rewritten to
 *     lvh.me (public DNS that resolves to 127.0.0.1). The server-to-server notify
 *     still needs a tunnel in dev.
 */

const DEV_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function sanitizeReturnBase(siteUrl: string): string {
  try {
    const u = new URL(siteUrl);
    if (DEV_LOOPBACK_HOSTS.has(u.hostname)) {
      u.hostname = 'lvh.me';
    }
    return u.toString().replace(/\/+$/, '');
  } catch {
    return siteUrl.replace(/\/+$/, '');
  }
}

export interface TeyaConfig {
  merchantId: string;
  paymentGatewayId: string;
  secretKey: string;
  apiUrl: string;
  currency: string;
  language: string;
  siteUrl: string;
  orderPrefix: string;
}

export interface TeyaCartItem {
  description: string;
  count: number;
  unitAmount: number; // cents
  totalAmount: number; // cents
}

export interface TeyaPaymentRequest {
  orderId: string; // max 12 alphanumeric characters
  amountCents: number;
  buyerName?: string;
  buyerEmail?: string;
  reference?: string; // our order UUID, for reconciliation
  cartItems: TeyaCartItem[];
}

export interface TeyaSignedParams {
  actionUrl: string;
  fields: Record<string, string>;
}

type Env = Record<string, string | undefined>;

/** Reads Teya config from env. Throws when a required key is missing. */
export function getTeyaConfig(env: Env = process.env): TeyaConfig {
  const merchantId = env.TEYA_MERCHANT_ID;
  const paymentGatewayId = env.TEYA_PAYMENT_GATEWAY_ID;
  const secretKey = env.TEYA_SECRET_KEY;
  const apiUrl = env.TEYA_API_URL;
  const siteUrl = env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!merchantId || !paymentGatewayId || !secretKey || !apiUrl) {
    throw new Error(
      'Teya konfiguracija nedostaje: TEYA_MERCHANT_ID, TEYA_PAYMENT_GATEWAY_ID, TEYA_SECRET_KEY, TEYA_API_URL su obavezni.',
    );
  }

  return {
    merchantId,
    paymentGatewayId,
    secretKey,
    apiUrl,
    currency: env.TEYA_CURRENCY || 'EUR',
    language: env.TEYA_LANGUAGE || 'HR',
    siteUrl: sanitizeReturnBase(siteUrl),
    orderPrefix: (env.TEYA_ORDER_PREFIX || 'WS').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'WS',
  };
}

/** 12-character alphanumeric OrderId: 2-letter prefix + order number padded to 10 digits. */
export function toTeyaOrderId(orderNumber: number, prefix = 'WS'): string {
  const padded = String(orderNumber).padStart(10, '0').slice(-10);
  return `${prefix}${padded}`;
}

/** Integer cents → "12.34" (dot decimal). */
export function formatTeyaAmount(amountCents: number): string {
  return (Math.round(amountCents) / 100).toFixed(2);
}

/** Teya amount string ("12.34", "12,34", "350") → cents, or null. */
export function parseTeyaAmount(amount: string): number | null {
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

/** CheckHash for the payment request. */
export function createCheckHash(params: {
  secretKey: string;
  merchantId: string;
  returnUrlSuccess: string;
  returnUrlSuccessServer: string;
  orderId: string;
  amount: string;
  currency: string;
}): string {
  const message = [
    params.merchantId,
    params.returnUrlSuccess,
    params.returnUrlSuccessServer,
    params.orderId,
    params.amount,
    params.currency,
  ].join('|');
  return hmacSha256Hex(params.secretKey, message);
}

/** Constant-time check of the OrderHash Teya returns on success. */
export function verifyOrderHash(params: {
  secretKey: string;
  orderId: string;
  amount: string;
  currency: string;
  orderHash: string;
}): boolean {
  const message = [params.orderId, params.amount, params.currency].join('|');
  const expected = hmacSha256Hex(params.secretKey, message);
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from((params.orderHash || '').toLowerCase(), 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function buildPaymentParams(config: TeyaConfig, req: TeyaPaymentRequest): TeyaSignedParams {
  const amount = formatTeyaAmount(req.amountCents);
  const orderId = req.orderId;

  const returnUrlSuccess = `${config.siteUrl}/api/teya/success`;
  const returnUrlSuccessServer = `${config.siteUrl}/api/teya/notify`;
  const returnUrlCancel = `${config.siteUrl}/api/teya/cancel`;
  const returnUrlError = `${config.siteUrl}/api/teya/error`;

  const checkhash = createCheckHash({
    secretKey: config.secretKey,
    merchantId: config.merchantId,
    returnUrlSuccess,
    returnUrlSuccessServer,
    orderId,
    amount,
    currency: config.currency,
  });

  const fields: Record<string, string> = {
    merchantid: config.merchantId,
    paymentgatewayid: config.paymentGatewayId,
    checkhash,
    orderid: orderId,
    currency: config.currency,
    language: config.language,
    amount,
    returnurlsuccess: returnUrlSuccess,
    returnurlsuccessserver: returnUrlSuccessServer,
    returnurlcancel: returnUrlCancel,
    returnurlerror: returnUrlError,
    // Skip Teya's receipt page and come straight back to the shop.
    skipreceiptpage: '1',
    // Only VISA / Mastercard logos on the payment page.
    showadditionalbrands: 'false',
  };

  if (req.buyerName) fields.buyername = req.buyerName;
  if (req.buyerEmail) fields.buyeremail = req.buyerEmail;
  if (req.reference) fields.reference = req.reference;

  const cartItems = req.cartItems.length
    ? req.cartItems
    : [
        {
          description: `Narudžba ${orderId}`,
          count: 1,
          unitAmount: req.amountCents,
          totalAmount: req.amountCents,
        },
      ];

  cartItems.forEach((item, index) => {
    fields[`itemdescription_${index}`] = (item.description || 'Proizvod').slice(0, 80);
    fields[`itemcount_${index}`] = String(item.count);
    fields[`itemunitamount_${index}`] = formatTeyaAmount(item.unitAmount);
    fields[`itemamount_${index}`] = formatTeyaAmount(item.totalAmount);
  });

  return { actionUrl: config.apiUrl, fields };
}

/** Form fields from a Teya callback (POST form or GET query), with the case variants Teya uses. */
export type TeyaCallback = {
  orderId: string;
  amount: string;
  currency: string;
  orderHash: string;
  status: string;
  reference: string;
  authCode: string | null;
  cardMask: string | null;
  raw: Record<string, string>;
};

export function readTeyaCallback(raw: Record<string, string>, defaultCurrency: string): TeyaCallback {
  return {
    orderId: raw.orderid || raw.OrderId || '',
    amount: raw.amount || raw.Amount || '',
    currency: raw.currency || raw.Currency || defaultCurrency,
    orderHash: raw.orderhash || raw.OrderHash || '',
    status: (raw.status || raw.Status || '').toLowerCase(),
    reference: raw.reference || raw.Reference || '',
    authCode: raw.authorizationcode || raw.AuthorizationCode || null,
    cardMask: raw.creditcardnumber || raw.maskedcardnumber || raw.cardmask || raw.CardMask || null,
    raw,
  };
}

export async function readTeyaParams(request: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  try {
    if (request.method === 'POST') {
      const form = await request.formData();
      form.forEach((v, k) => {
        params[k] = typeof v === 'string' ? v : '';
      });
    } else {
      new URL(request.url).searchParams.forEach((v, k) => {
        params[k] = v;
      });
    }
  } catch {
    // Unparseable body: treat as empty.
  }
  return params;
}
