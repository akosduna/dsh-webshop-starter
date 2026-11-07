import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const priceFormatter = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });

/** 1990 → "19,90 €" */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

/** "19,90" / "19.90" / "19" → 1990. Returns null for invalid input. */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Cents → "19,90" for form inputs. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

const CROATIAN_CHARS: Record<string, string> = { č: 'c', ć: 'c', đ: 'd', š: 's', ž: 'z' };

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[čćđšž]/g, (ch) => CROATIAN_CHARS[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
