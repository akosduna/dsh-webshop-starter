import type { GlsAddress, GlsPickupPoint } from '@/lib/gls/types';

export function normalizeZip(zip: string): string {
  return zip.replace(/\s+/g, '');
}

export function countryToIso(country: string | null | undefined): string {
  const value = (country || 'HR').trim();
  if (value.length === 2) return value.toUpperCase();
  const lower = value.toLowerCase();
  if (lower.startsWith('hrvat') || lower === 'croatia') return 'HR';
  return 'HR';
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Splits "Ulica 12a" into street + numeric house number.
 * HouseNumber in MyGLS must be digits only; the letter goes to HouseNumberInfo.
 */
export function splitStreet(streetAddress: string): {
  Street: string;
  HouseNumber?: string;
  HouseNumberInfo?: string;
} {
  const street = streetAddress.trim().replace(/\s+/g, ' ');
  const match = street.match(/^(.*?)[\s,]+(\d+)\s*([A-Za-z])?$/);
  if (!match || !match[1].trim()) {
    return { Street: street };
  }
  return {
    Street: match[1].trim(),
    HouseNumber: match[2],
    ...(match[3] ? { HouseNumberInfo: match[3].toUpperCase() } : {}),
  };
}

export function buildGlsAddress(input: {
  name: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country?: string | null;
  contactName?: string;
  phone?: string;
  email?: string;
}): GlsAddress {
  const street = splitStreet(input.streetAddress);
  return {
    Name: input.name.trim(),
    ...street,
    City: input.city.trim(),
    ZipCode: normalizeZip(input.postalCode),
    CountryIsoCode: countryToIso(input.country),
    ...(input.contactName ? { ContactName: input.contactName.trim() } : {}),
    ...(input.phone ? { ContactPhone: normalizePhone(input.phone) } : {}),
    ...(input.email ? { ContactEmail: input.email.trim() } : {}),
  };
}

export function pickupToDeliveryAddress(
  pickup: GlsPickupPoint,
  contact: { name: string; phone: string; email: string },
): GlsAddress {
  const streetLine = pickup.contact?.address || pickup.name || 'ParcelShop';
  return buildGlsAddress({
    name: pickup.name || 'GLS ParcelShop',
    streetAddress: streetLine,
    city: pickup.contact?.city || '',
    postalCode: pickup.contact?.postalCode || '',
    country: pickup.contact?.countryCode || 'HR',
    contactName: contact.name,
    phone: contact.phone,
    email: contact.email,
  });
}
