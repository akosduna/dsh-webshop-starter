/**
 * Shop schema (Neon Postgres, Drizzle). This file is the source of truth.
 * Change it, then `npm run db:generate` (writes SQL to drizzle/) and
 * `npm run db:migrate` (applies it). Commit the generated migrations.
 *
 * Money is stored as integer cents (EUR): 1990 = 19,90 €.
 * Property names mirror the SQL column names (snake_case) on purpose, so
 * rows can be passed to components without renaming.
 *
 * There is no row-level security: every query runs on the server, and
 * access checks live in server actions, route handlers and the admin layout.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import type {
  AddressSnapshot,
  OrderEmailKind,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PickupPoint,
  ShippingMethodType,
} from './enums';

export * from './auth-schema';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export * from './enums';

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/** Extra customer data next to Better Auth's user row (name lives on user). */
export const customerProfiles = pgTable('customer_profiles', {
  user_id: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  phone: text('phone'),
  updated_at: updatedAt(),
});

/** Saved addresses. Orders keep their own snapshot, so deleting one is safe. */
export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    full_name: text('full_name').notNull(),
    company: text('company'),
    street: text('street').notNull(),
    city: text('city').notNull(),
    postal_code: text('postal_code').notNull(),
    country: text('country').notNull().default('HR'),
    phone: text('phone'),
    is_default: boolean('is_default').notNull().default(false),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [index('addresses_user_id_idx').on(t.user_id)],
);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** One level of subcategories (parent_id), enforced in saveCategory. */
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parent_id: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    image_url: text('image_url'),
    sort_order: integer('sort_order').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index('categories_parent_id_idx').on(t.parent_id),
    check('categories_not_own_parent', sql`${t.parent_id} is null or ${t.parent_id} <> ${t.id}`),
  ],
);

/** option_names lists variant dimensions, e.g. {Veličina,Boja}. stock_quantity is used only without variants. */
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category_id: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    price_cents: integer('price_cents').notNull(),
    sku: text('sku'),
    stock_quantity: integer('stock_quantity').notNull().default(0),
    option_names: text('option_names').array().notNull().default(sql`'{}'::text[]`),
    is_active: boolean('is_active').notNull().default(true),
    is_featured: boolean('is_featured').notNull().default(false),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index('products_category_id_idx').on(t.category_id),
    index('products_active_featured_idx').on(t.is_active, t.is_featured),
    check('products_price_cents_check', sql`${t.price_cents} >= 0`),
    check('products_stock_quantity_check', sql`${t.stock_quantity} >= 0`),
  ],
);

/** The first image by sort_order is the main one. url is a Vercel Blob URL or a /public path. */
export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt'),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: createdAt(),
  },
  (t) => [index('product_images_product_id_idx').on(t.product_id, t.sort_order)],
);

/** options e.g. {"Veličina": "M", "Boja": "Crna"}. price_cents NULL = product price. */
export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    options: jsonb('options').$type<Record<string, string>>().notNull().default({}),
    sku: text('sku'),
    price_cents: integer('price_cents'),
    stock_quantity: integer('stock_quantity').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index('product_variants_product_id_idx').on(t.product_id, t.sort_order),
    check('product_variants_price_cents_check', sql`${t.price_cents} is null or ${t.price_cents} >= 0`),
    check('product_variants_stock_quantity_check', sql`${t.stock_quantity} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Shipping + settings
// ---------------------------------------------------------------------------

/**
 * Delivery options shown at checkout.
 * type decides the behaviour: delivery = flat-rate address delivery,
 * pickup = in-store pickup, gls_address / gls_parcel / boxnow = carrier
 * integrations (shown only when that module is ready, see src/config/modules.ts).
 */
export const shippingMethods = pgTable(
  'shipping_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').$type<ShippingMethodType>().notNull().default('delivery'),
    price_cents: integer('price_cents').notNull().default(0),
    /** Free when the cart subtotal is at least this much. NULL = never free. */
    free_over_cents: integer('free_over_cents'),
    /** Hidden when the cart subtotal is this much or more (e.g. locker insurance limit). NULL = no limit. */
    max_subtotal_cents: integer('max_subtotal_cents'),
    /** ISO country codes for address delivery. NULL = every country in the checkout list. */
    countries: text('countries').array(),
    sort_order: integer('sort_order').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    check(
      'shipping_methods_type_check',
      sql`${t.type} in ('delivery', 'pickup', 'gls_address', 'gls_parcel', 'boxnow')`,
    ),
    check('shipping_methods_price_cents_check', sql`${t.price_cents} >= 0`),
  ],
);

/** Exactly one row (id = 1). */
export const storeSettings = pgTable(
  'store_settings',
  {
    id: integer('id').primaryKey().default(1),
    shop_name: text('shop_name').notNull().default('Moja trgovina'),
    tagline: text('tagline'),
    contact_email: text('contact_email'),
    contact_phone: text('contact_phone'),
    address: text('address'),
    hero_title: text('hero_title'),
    hero_subtitle: text('hero_subtitle'),
    updated_at: updatedAt(),
  },
  (t) => [check('store_settings_singleton', sql`${t.id} = 1`)],
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * Address, product names and prices are snapshots taken at checkout.
 * Stock: bank transfer reserves stock at creation (stock_decremented_at),
 * card payments take it when paid. Cancelling restores it once (stock_restored_at).
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    order_number: integer('order_number')
      .notNull()
      .unique()
      .generatedByDefaultAsIdentity({ startWith: 1001 }),
    /** Random secret in guest links (success page, barcode). */
    access_token: text('access_token').notNull(),
    user_id: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    phone: text('phone'),
    status: text('status').$type<OrderStatus>().notNull().default('awaiting_payment'),
    payment_method: text('payment_method').$type<PaymentMethod>().notNull(),
    payment_status: text('payment_status').$type<PaymentStatus>().notNull().default('unpaid'),
    /** Bank transfer "poziv na broj" (fixed at creation). */
    payment_reference: text('payment_reference'),
    shipping_method_id: uuid('shipping_method_id').references(() => shippingMethods.id, {
      onDelete: 'set null',
    }),
    shipping_method_name: text('shipping_method_name').notNull(),
    shipping_method_type: text('shipping_method_type').$type<ShippingMethodType>().notNull(),
    pickup_point: jsonb('pickup_point').$type<PickupPoint>(),
    subtotal_cents: integer('subtotal_cents').notNull(),
    shipping_cents: integer('shipping_cents').notNull().default(0),
    total_cents: integer('total_cents').notNull(),
    currency: text('currency').notNull().default('EUR'),
    shipping_address: jsonb('shipping_address').$type<AddressSnapshot>(),
    billing_address: jsonb('billing_address').$type<AddressSnapshot>().notNull(),
    customer_note: text('customer_note'),
    stripe_payment_intent_id: text('stripe_payment_intent_id').unique(),
    teya_order_id: text('teya_order_id'),
    teya_auth_code: text('teya_auth_code'),
    teya_card_mask: text('teya_card_mask'),
    teya_raw_response: jsonb('teya_raw_response').$type<Record<string, string>>(),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    stock_decremented_at: timestamp('stock_decremented_at', { withTimezone: true }),
    stock_restored_at: timestamp('stock_restored_at', { withTimezone: true }),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index('orders_user_id_idx').on(t.user_id),
    index('orders_created_at_idx').on(t.created_at),
    index('orders_status_idx').on(t.status),
    index('orders_teya_order_id_idx').on(t.teya_order_id),
    check(
      'orders_status_check',
      sql`${t.status} in ('awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled')`,
    ),
    check('orders_payment_method_check', sql`${t.payment_method} in ('bank_transfer', 'stripe', 'teya')`),
    check('orders_payment_status_check', sql`${t.payment_status} in ('unpaid', 'paid', 'failed', 'refunded')`),
    check('orders_totals_check', sql`${t.subtotal_cents} >= 0 and ${t.shipping_cents} >= 0 and ${t.total_cents} >= 0`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    order_id: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    product_id: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    variant_id: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    product_name: text('product_name').notNull(),
    variant_name: text('variant_name'),
    sku: text('sku'),
    image_url: text('image_url'),
    unit_price_cents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    line_total_cents: integer('line_total_cents').notNull(),
    created_at: createdAt(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.order_id),
    check('order_items_quantity_check', sql`${t.quantity} > 0`),
  ],
);

/** One active GLS / BOX NOW shipment per order and carrier. The label PDF stays private in the database. */
export const shipments = pgTable(
  'shipments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    order_id: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: text('provider').$type<'gls' | 'boxnow'>().notNull(),
    provider_shipment_id: text('provider_shipment_id'),
    tracking_number: text('tracking_number'),
    status: text('status')
      .$type<'pending' | 'labeled' | 'delivered' | 'error' | 'cancelled'>()
      .notNull()
      .default('pending'),
    provider_status: text('provider_status'),
    pickup_point: jsonb('pickup_point').$type<PickupPoint>(),
    label_pdf: bytea('label_pdf'),
    request_payload: jsonb('request_payload'),
    response_payload: jsonb('response_payload'),
    tracking_payload: jsonb('tracking_payload'),
    error_message: text('error_message'),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    uniqueIndex('shipments_provider_id_unique')
      .on(t.provider, t.provider_shipment_id)
      .where(sql`${t.provider_shipment_id} is not null`),
    uniqueIndex('shipments_one_active_per_order_provider')
      .on(t.order_id, t.provider)
      .where(sql`${t.status} <> 'cancelled'`),
  ],
);

export const shipmentEvents = pgTable('shipment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  shipment_id: uuid('shipment_id')
    .notNull()
    .references(() => shipments.id, { onDelete: 'cascade' }),
  provider_event_id: text('provider_event_id').unique(),
  event_type: text('event_type').notNull(),
  event_time: timestamp('event_time', { withTimezone: true }),
  payload: jsonb('payload').notNull(),
  created_at: createdAt(),
});

/** Optional order e-mails module: one row per order and kind keeps every e-mail to a single send. */
export const orderEmails = pgTable(
  'order_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    order_id: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<OrderEmailKind>().notNull(),
    recipient: text('recipient').notNull(),
    status: text('status').$type<'sending' | 'sent' | 'failed'>().notNull().default('sending'),
    provider_id: text('provider_id'),
    error_message: text('error_message'),
    created_at: createdAt(),
  },
  (t) => [uniqueIndex('order_emails_order_kind_unique').on(t.order_id, t.kind)],
);

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt'),
    /** Sanitised HTML from the admin editor. */
    content: text('content').notNull().default(''),
    cover_image_url: text('cover_image_url'),
    status: text('status').$type<'draft' | 'published'>().notNull().default('draft'),
    meta_title: text('meta_title'),
    meta_description: text('meta_description'),
    published_at: timestamp('published_at', { withTimezone: true }),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index('blog_posts_status_published_idx').on(t.status, t.published_at),
    check('blog_posts_status_check', sql`${t.status} in ('draft', 'published')`),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parent_id],
    references: [categories.id],
    relationName: 'category_parent',
  }),
  children: many(categories, { relationName: 'category_parent' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.category_id], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.product_id], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.product_id], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  order_items: many(orderItems),
  shipments: many(shipments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.order_id], references: [orders.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, { fields: [shipments.order_id], references: [orders.id] }),
  events: many(shipmentEvents),
}));

export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentEvents.shipment_id], references: [shipments.id] }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ShippingMethodRow = typeof shippingMethods.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
