import { buildGlsAddress, pickupToDeliveryAddress } from '@/lib/gls/address';
import type { GlsAddress, GlsPickupPoint } from '@/lib/gls/types';

/** Sender (pickup) address from GLS_SENDER_* env — required by the gls module. */
export function getGlsSenderAddress(env: Record<string, string | undefined> = process.env): GlsAddress {
  const street = env.GLS_SENDER_STREET;
  const city = env.GLS_SENDER_CITY;
  const zip = env.GLS_SENDER_ZIP;
  const name = env.GLS_SENDER_NAME;
  if (!street || !city || !zip || !name) {
    throw new Error('Adresa pošiljatelja nije postavljena (GLS_SENDER_NAME, _STREET, _CITY, _ZIP).');
  }
  return buildGlsAddress({
    name,
    streetAddress: env.GLS_SENDER_HOUSE_NUMBER ? `${street} ${env.GLS_SENDER_HOUSE_NUMBER}` : street,
    city,
    postalCode: zip,
    country: env.GLS_SENDER_COUNTRY || 'HR',
    contactName: env.GLS_SENDER_CONTACT_NAME || name,
    phone: env.GLS_SENDER_PHONE,
    email: env.GLS_SENDER_EMAIL,
  });
}

export function buildPrintLabelsBody(input: {
  clientNumber: number;
  clientReference: string;
  sender: GlsAddress;
  recipient: GlsAddress;
  content: string;
  pickup?: GlsPickupPoint | null;
  printerType?: string;
}) {
  const serviceList = [];
  if (input.pickup?.id) {
    serviceList.push({
      Code: 'PSD',
      PSDParameter: { StringValue: input.pickup.id },
    });
  }

  // No FinalDeliveryAddress: GLS HR rejects it as service 'FDA' on PSD parcels.
  const parcel: Record<string, unknown> = {
    ClientNumber: input.clientNumber,
    ClientReference: input.clientReference,
    Count: 1,
    Content: input.content,
    PickupAddress: input.sender,
    DeliveryAddress: input.recipient,
    ServiceList: serviceList,
  };

  return {
    WebshopEngine: 'nextjs-webshop',
    ParcelList: [parcel],
    PrintPosition: 1,
    TypeOfPrinter: input.printerType || 'A4_2x2',
    ShowPrintDialog: false,
  };
}

export function deliveryAddressForOrder(input: {
  method: 'gls_address' | 'gls_parcel';
  pickup: GlsPickupPoint | null;
  customer: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country?: string | null;
    phone: string;
    email: string;
  };
}): GlsAddress {
  if (input.method === 'gls_parcel' && input.pickup?.id) {
    return pickupToDeliveryAddress(input.pickup, {
      name: input.customer.name,
      phone: input.customer.phone,
      email: input.customer.email,
    });
  }

  return buildGlsAddress({
    name: input.customer.name,
    streetAddress: input.customer.street,
    city: input.customer.city,
    postalCode: input.customer.postalCode,
    country: input.customer.country,
    contactName: input.customer.name,
    phone: input.customer.phone,
    email: input.customer.email,
  });
}
