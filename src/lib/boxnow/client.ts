import { liveSideEffectsAllowed, PREVIEW_BLOCKED_MESSAGE } from '@/lib/live-guard';

/**
 * BOX NOW partner API (Croatia). Default base URL is production; set
 * BOXNOW_API_URL to the sandbox URL BOX NOW gives you for testing.
 */
const API_URL = () => (process.env.BOXNOW_API_URL || 'https://api-production.boxnow.hr').replace(/\/$/, '');
const USER_AGENT = 'nextjs-webshop/1.0';

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function boxNowPartnerId(): string {
  return process.env.BOXNOW_PARTNER_ID?.trim() || '';
}

function requiredConfig() {
  const clientId = process.env.BOXNOW_CLIENT_ID?.trim();
  const clientSecret = process.env.BOXNOW_CLIENT_SECRET?.trim();
  const partnerId = process.env.BOXNOW_PARTNER_ID?.trim();
  const warehouseId = process.env.BOXNOW_WAREHOUSE_ID?.trim();
  if (!clientId || !clientSecret || !partnerId || !warehouseId) {
    throw new Error('BOX NOW pristupni podaci nisu postavljeni.');
  }
  return { clientId, clientSecret, partnerId, warehouseId };
}

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }
  const { clientId, clientSecret } = requiredConfig();
  const response = await fetch(`${API_URL()}/api/v1/auth-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.message || 'BOX NOW prijava nije uspjela.');
  }
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in || 3600) * 1000,
  };
  return body.access_token;
}

function isProductionApi(): boolean {
  return /api-production\.boxnow/.test(API_URL());
}

async function boxNowFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  if (method !== 'GET' && isProductionApi() && !liveSideEffectsAllowed()) {
    throw new Error(PREVIEW_BLOCKED_MESSAGE);
  }
  const { partnerId } = requiredConfig();
  const token = await accessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-PartnerID', partnerId);
  headers.set('User-Agent', USER_AGENT);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return fetch(`${API_URL()}${path}`, { ...init, headers, signal: AbortSignal.timeout(60_000) });
}

/** A BOX NOW API error with what we sent and what came back, for the shipment audit. */
export class BoxNowApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: unknown,
    public readonly requestBody?: unknown,
  ) {
    super(message);
    this.name = 'BoxNowApiError';
  }
}

async function apiError(response: Response, requestBody?: unknown): Promise<BoxNowApiError> {
  const text = await response.text().catch(() => '');
  let body: { message?: string; error?: string; code?: string } | string | null = text || null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep the raw text
  }
  const parsed = typeof body === 'object' && body ? body : null;
  const detail = parsed?.message || parsed?.error || (typeof body === 'string' ? body.slice(0, 200) : '');
  const code = parsed?.code ? ` [${parsed.code}]` : '';
  const message = `BOX NOW greška ${response.status}${code}${detail ? `: ${detail}` : ''}`;
  return new BoxNowApiError(message, response.status, body, requestBody);
}

export type BoxNowDeliveryInput = {
  orderNumber: string;
  invoiceValue: string;
  originName: string;
  originPhone: string;
  originEmail: string;
  destinationName: string;
  destinationPhone: string;
  destinationEmail: string;
  lockerId: string;
  itemName: string;
};

export function buildBoxNowDeliveryRequest(input: BoxNowDeliveryInput, warehouseId: string, compartmentSize: number) {
  return {
    orderNumber: input.orderNumber,
    invoiceValue: input.invoiceValue,
    paymentMode: 'prepaid',
    amountToBeCollected: '0.00',
    allowReturn: true,
    origin: {
      contactNumber: input.originPhone,
      contactEmail: input.originEmail,
      contactName: input.originName,
      locationId: warehouseId,
    },
    destination: {
      contactNumber: input.destinationPhone,
      contactEmail: input.destinationEmail,
      contactName: input.destinationName,
      locationId: input.lockerId,
    },
    items: [
      {
        id: input.orderNumber,
        name: input.itemName,
        value: input.invoiceValue,
        weight: null,
        compartmentSize: Number.isFinite(compartmentSize) ? compartmentSize : 2,
      },
    ],
  };
}

export async function createBoxNowDelivery(input: BoxNowDeliveryInput): Promise<{
  parcelId: string;
  referenceNumber: string;
  requestBody: unknown;
  responseBody: unknown;
}> {
  const { warehouseId } = requiredConfig();
  const requestBody = buildBoxNowDeliveryRequest(
    input,
    warehouseId,
    Number(process.env.BOXNOW_COMPARTMENT_SIZE || 2),
  );
  const response = await boxNowFetch('/api/v1/delivery-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await apiError(response, requestBody);
  }

  const body = (await response.json()) as {
    referenceNumber?: string;
    parcels?: Array<{ id?: string }>;
  };
  const parcelId = body.parcels?.[0]?.id;
  if (!parcelId) {
    throw new BoxNowApiError('BOX NOW nije vratio broj pošiljke.', response.status, body, requestBody);
  }
  return {
    parcelId: String(parcelId),
    referenceNumber: body.referenceNumber || input.orderNumber,
    requestBody,
    responseBody: body,
  };
}

export async function fetchBoxNowLabel(parcelId: string): Promise<Buffer> {
  const response = await boxNowFetch(`/api/v1/parcels/${encodeURIComponent(parcelId)}/label.pdf`, {
    headers: { Accept: 'application/pdf' },
  });
  if (!response.ok) {
    throw await apiError(response, { parcelId });
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function cancelBoxNowParcel(parcelId: string): Promise<void> {
  const response = await boxNowFetch(`/api/v1/parcels/${encodeURIComponent(parcelId)}:cancel`, {
    method: 'POST',
  });
  if (!response.ok && response.status !== 204) {
    throw await apiError(response, { parcelId });
  }
}
