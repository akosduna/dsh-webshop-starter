/**
 * Shop modules — one place to switch features on and off.
 *
 * A module is used only when `enabled` is true AND every key in `requiredEnv`
 * is set (not empty, not a REPLACE_ME placeholder). Modules without keys
 * (bank transfer details aside) work as soon as they are enabled.
 * The admin dashboard shows the status of every module.
 *
 * To turn a module off: set `enabled: false` here and redeploy.
 */
export type ModuleId =
  | 'bank_transfer'
  | 'stripe'
  | 'teya'
  | 'gls'
  | 'boxnow'
  | 'flat_rate_delivery'
  | 'store_pickup'
  | 'blog'
  | 'order_emails'
  | 'blob_uploads';

export type ModuleDefinition = {
  id: ModuleId;
  /** Label in the admin dashboard (Croatian). */
  label: string;
  enabled: boolean;
  requiredEnv: readonly string[];
  /** Short hint shown in the admin status card. */
  description: string;
};

export const modules: Record<ModuleId, ModuleDefinition> = {
  bank_transfer: {
    id: 'bank_transfer',
    label: 'Plaćanje virmanom (HUB-3 barkod)',
    enabled: true,
    requiredEnv: ['BANK_IBAN', 'BANK_RECIPIENT_NAME', 'BANK_RECIPIENT_STREET', 'BANK_RECIPIENT_CITY'],
    description: 'Uplatnica s PDF417 barkodom na stranici narudžbe.',
  },
  stripe: {
    id: 'stripe',
    label: 'Kartično plaćanje (Stripe)',
    enabled: true,
    requiredEnv: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
    description: 'Kartice, Apple Pay i Google Pay preko Stripea.',
  },
  teya: {
    id: 'teya',
    label: 'Kartično plaćanje (Teya)',
    enabled: false,
    requiredEnv: ['TEYA_MERCHANT_ID', 'TEYA_PAYMENT_GATEWAY_ID', 'TEYA_SECRET_KEY', 'TEYA_API_URL'],
    description: 'Teya SecurePay stranica za plaćanje (preusmjeravanje).',
  },
  gls: {
    id: 'gls',
    label: 'GLS dostava i paketomati',
    enabled: true,
    requiredEnv: [
      'GLS_USERNAME',
      'GLS_PASSWORD',
      'GLS_CLIENT_NUMBER',
      'GLS_SENDER_NAME',
      'GLS_SENDER_STREET',
      'GLS_SENDER_CITY',
      'GLS_SENDER_ZIP',
    ],
    description: 'Dostava na adresu i GLS paketomati / ParcelShopovi, naljepnice i praćenje.',
  },
  boxnow: {
    id: 'boxnow',
    label: 'BOX NOW paketomati',
    enabled: true,
    requiredEnv: [
      'BOXNOW_CLIENT_ID',
      'BOXNOW_CLIENT_SECRET',
      'BOXNOW_PARTNER_ID',
      'BOXNOW_WAREHOUSE_ID',
      'BOXNOW_WEBHOOK_SECRET',
    ],
    description: 'Dostava u BOX NOW paketomat, naljepnice i praćenje.',
  },
  flat_rate_delivery: {
    id: 'flat_rate_delivery',
    label: 'Dostava na adresu (fiksna cijena)',
    enabled: true,
    requiredEnv: [],
    description: 'Cijena i besplatna dostava se uređuju u Postavkama.',
  },
  store_pickup: {
    id: 'store_pickup',
    label: 'Osobno preuzimanje',
    enabled: true,
    requiredEnv: [],
    description: 'Kupac preuzima narudžbu u trgovini.',
  },
  blog: {
    id: 'blog',
    label: 'Blog',
    enabled: true,
    requiredEnv: [],
    description: 'Objave na /blog, uređivanje u adminu.',
  },
  order_emails: {
    id: 'order_emails',
    label: 'E-mailovi o narudžbi (Resend)',
    enabled: false,
    requiredEnv: ['RESEND_API_KEY', 'EMAIL_FROM'],
    description: 'Potvrda narudžbe, upute za uplatu, plaćeno, poslano.',
  },
  blob_uploads: {
    id: 'blob_uploads',
    label: 'Upload slika (Vercel Blob)',
    enabled: true,
    requiredEnv: ['BLOB_READ_WRITE_TOKEN'],
    description: 'Slike proizvoda i bloga. Bez ključa se slike ne mogu učitavati.',
  },
};
