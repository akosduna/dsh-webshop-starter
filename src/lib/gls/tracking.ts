export function formatGlsStatusDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const dotnet = value.match(/\/Date\((\d+)/);
  const date = dotnet ? new Date(Number(dotnet[1])) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('hr-HR');
}

/**
 * MyGLS status codes that mean the consignee has the parcel
 * (MyGLS API appendix): 05 delivered, 58 delivered at the neighbour's,
 * 92 delivered. 54 / 55 (left in a parcel box / ParcelShop) are not final:
 * the customer still has to collect it, which GLS then reports as 05.
 */
export const GLS_DELIVERED_CODES = new Set([5, 58, 92]);

export type GlsDelivery = {
  delivered: boolean;
  code: number | null;
  time: string | null;
  text: string | null;
};

function statusTime(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const dotnet = value.match(/\/Date\((\d+)/);
  const ms = dotnet ? Number(dotnet[1]) : Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/** Finds the delivery scan in a GetParcelStatuses response, if there is one. */
export function findGlsDelivery(payload: unknown): GlsDelivery {
  const none: GlsDelivery = { delivered: false, code: null, time: null, text: null };
  if (!payload || typeof payload !== 'object') return none;
  const list = (payload as { ParcelStatusList?: unknown }).ParcelStatusList;
  if (!Array.isArray(list)) return none;

  const hits = list
    .map((item) => item as Record<string, unknown>)
    .filter((row) => GLS_DELIVERED_CODES.has(Number(row.StatusCode)))
    .sort((a, b) => statusTime(b.StatusDate) - statusTime(a.StatusDate));
  const hit = hits[0];
  if (!hit) return none;

  const ms = statusTime(hit.StatusDate);
  return {
    delivered: true,
    code: Number(hit.StatusCode),
    time: ms ? new Date(ms).toISOString() : null,
    text:
      (typeof hit.StatusDescription === 'string' && hit.StatusDescription) ||
      (typeof hit.StatusInfo === 'string' && hit.StatusInfo) ||
      null,
  };
}

export function extractTrackingRows(payload: unknown): Array<{
  time: string | null;
  text: string;
}> {
  if (!payload || typeof payload !== 'object') return [];
  const list = (payload as { ParcelStatusList?: unknown }).ParcelStatusList;
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    const text =
      (typeof row.StatusDescription === 'string' && row.StatusDescription) ||
      (typeof row.StatusInfo === 'string' && row.StatusInfo) ||
      (typeof row.StatusCode === 'string' && row.StatusCode) ||
      'Status ažuriran';
    return {
      time: formatGlsStatusDate(row.StatusDate),
      text,
    };
  });
}
