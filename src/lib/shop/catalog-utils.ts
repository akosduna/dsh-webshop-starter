export type VariantOption = Record<string, string>;

/** jsonb options → { "Veličina": "M" } (drops non-string values). */
export function toVariantOptions(value: unknown): VariantOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: VariantOption = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'string') result[key] = v;
  }
  return result;
}
