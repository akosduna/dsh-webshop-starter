import { createHash } from 'crypto';
import { liveSideEffectsAllowed, PREVIEW_BLOCKED_MESSAGE } from '@/lib/live-guard';

/**
 * MyGLS REST client (Croatia).
 * The password is sent as a SHA-512 byte array, as the official API expects.
 * Cash on delivery, courier pickup scheduling and express services are not used.
 */

export class GlsApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'GlsApiError';
  }
}

export type GlsConfig = {
  mode: 'test' | 'production';
  username: string;
  password: string;
  clientNumber: number;
  baseUrl: string;
};

export function getGlsConfig(): GlsConfig {
  const username = process.env.GLS_USERNAME?.trim();
  const password = process.env.GLS_PASSWORD ?? '';
  const clientNumber = Number(process.env.GLS_CLIENT_NUMBER);
  const mode = process.env.GLS_MODE === 'production' ? 'production' : 'test';

  if (!username || !password || !Number.isFinite(clientNumber)) {
    throw new GlsApiError('GLS pristupni podaci nisu postavljeni.');
  }

  return {
    mode,
    username,
    password,
    clientNumber,
    baseUrl: mode === 'production' ? 'https://api.mygls.hr' : 'https://api.test.mygls.hr',
  };
}

export function hashGlsPassword(password: string): number[] {
  const digest = createHash('sha512').update(password, 'utf8').digest();
  return Array.from(digest);
}

function redactForLog(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactForLog);
  const copy: Record<string, unknown> = {
    ...(value as Record<string, unknown>),
  };
  if ('Username' in copy) copy.Username = '***';
  if ('Password' in copy) copy.Password = '***';
  if (copy.Labels) copy.Labels = '[pdf]';
  if (copy.POD) copy.POD = '[pdf]';
  if (Array.isArray(copy.ParcelList)) {
    copy.ParcelList = copy.ParcelList.map(redactForLog);
  }
  return copy;
}

export function decodeGlsPdf(labels: unknown): Buffer {
  if (typeof labels === 'string' && labels.length > 0) {
    const raw = labels.replace(/^data:application\/pdf;base64,/, '');
    return Buffer.from(raw, 'base64');
  }
  if (Array.isArray(labels) && labels.length > 0) {
    return Buffer.from(labels as number[]);
  }
  throw new GlsApiError('GLS nije vratio PDF naljepnicu.');
}

/** MyGLS methods that only read data; safe to call outside production. */
const GLS_READ_ONLY_METHODS = new Set(['GetParcelStatuses']);

export async function glsPost<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ data: T; requestForAudit: unknown }> {
  const config = getGlsConfig();
  if (config.mode === 'production' && !GLS_READ_ONLY_METHODS.has(method) && !liveSideEffectsAllowed()) {
    throw new GlsApiError(PREVIEW_BLOCKED_MESSAGE);
  }
  const payload = {
    Username: config.username,
    Password: hashGlsPassword(config.password),
    ...body,
  };

  const url = `${config.baseUrl}/ParcelService.svc/json/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new GlsApiError('GLS je vratio neispravan odgovor.');
  }

  if (!response.ok) {
    const message =
      (typeof data.Message === 'string' && data.Message) ||
      (response.status === 401
        ? 'GLS prijava nije uspjela. Provjerite korisničko ime i lozinku.'
        : `GLS API greška (${response.status}).`);
    throw new GlsApiError(message, response.status);
  }

  if (typeof data.ErrorCode === 'number' && data.ErrorCode !== 0) {
    throw new GlsApiError(
      typeof data.ErrorDescription === 'string' ? data.ErrorDescription : 'GLS API greška.',
      data.ErrorCode,
    );
  }

  return { data: data as T, requestForAudit: redactForLog(payload) };
}

type GlsErrorEntry = { ErrorCode?: number; ErrorDescription?: string };

/** MyGLS reports per-parcel problems in *ErrorList arrays even with HTTP 200. */
export function firstGlsListError(data: Record<string, unknown>, listName: string): string | null {
  const list = data[listName];
  if (!Array.isArray(list) || list.length === 0) return null;
  const entry = list[0] as GlsErrorEntry;
  return entry.ErrorDescription || (entry.ErrorCode ? `GLS greška ${entry.ErrorCode}` : 'GLS greška');
}
