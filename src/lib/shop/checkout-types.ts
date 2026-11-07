// Shared between the checkout form (client) and the createOrder action (server).
import type { PaymentMethod, PickupPoint } from '@/db/enums';

export type AddressInput = {
  full_name: string;
  company: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
};

export type CheckoutInput = {
  email: string;
  phone: string;
  items: { productId: string; variantId: string | null; quantity: number }[];
  shippingMethodId: string;
  pickupPoint: PickupPoint | null;
  paymentMethod: PaymentMethod;
  shippingAddress: AddressInput;
  billingSameAsShipping: boolean;
  billingAddress: AddressInput;
  note: string;
  acceptTerms: boolean;
  saveAddress: boolean;
};

export type TeyaRedirect = { actionUrl: string; fields: Record<string, string> };

export type CheckoutResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: number;
      accessToken: string;
      paymentMethod: PaymentMethod;
      subtotalCents: number;
      shippingCents: number;
      totalCents: number;
      /** Stripe only. */
      clientSecret?: string;
      /** Teya only. */
      teya?: TeyaRedirect;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Payment options offered at checkout (only modules that are ready). */
export type PaymentOption = { id: PaymentMethod; label: string; description: string };

export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'HR', name: 'Hrvatska' },
  { code: 'SI', name: 'Slovenija' },
  { code: 'AT', name: 'Austrija' },
  { code: 'DE', name: 'Njemačka' },
  { code: 'IT', name: 'Italija' },
  { code: 'HU', name: 'Mađarska' },
];

export const emptyAddress: AddressInput = {
  full_name: '',
  company: '',
  street: '',
  city: '',
  postal_code: '',
  country: 'HR',
  phone: '',
};
