-- =============================================================================
-- 0003 — Grants + Row Level Security
--
-- Supabase no longer auto-grants new public tables (since 30.10.2026), so each
-- table gets explicit grants here. Grants say WHICH operations a role may try;
-- RLS policies decide WHICH ROWS. Orders/order_items are written only by the
-- server with the service role (secret key), never directly from the browser.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Service role (server code, webhook) — full access to everything.
grant all on all tables in schema public to service_role;
grant usage, select on sequence public.order_number_seq to service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- Users can read their own profile and edit only name/phone (column grant),
-- so nobody can promote themselves to admin. Admins can read all profiles.
-- Role changes happen in the SQL editor (see AGENT-SETUP.md).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catalog: categories, products, product_images, product_variants
-- Public read of active rows; admins read and write everything.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.product_images enable row level security;
revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read" on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_active or (select public.is_admin()))
    )
  );

drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_admin_write" on public.product_images
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.product_variants enable row level security;
revoke all on public.product_variants from anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read" on public.product_variants
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or (
      is_active
      and exists (select 1 from public.products p where p.id = product_id and p.is_active)
    )
  );

drop policy if exists "product_variants_admin_write" on public.product_variants;
create policy "product_variants_admin_write" on public.product_variants
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- shipping_methods + store_settings — public read, admin write
-- ---------------------------------------------------------------------------
alter table public.shipping_methods enable row level security;
revoke all on public.shipping_methods from anon, authenticated;
grant select on public.shipping_methods to anon, authenticated;
grant insert, update, delete on public.shipping_methods to authenticated;

drop policy if exists "shipping_methods_public_read" on public.shipping_methods;
create policy "shipping_methods_public_read" on public.shipping_methods
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "shipping_methods_admin_write" on public.shipping_methods;
create policy "shipping_methods_admin_write" on public.shipping_methods
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.store_settings enable row level security;
revoke all on public.store_settings from anon, authenticated;
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;

drop policy if exists "store_settings_public_read" on public.store_settings;
create policy "store_settings_public_read" on public.store_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "store_settings_admin_update" on public.store_settings;
create policy "store_settings_admin_update" on public.store_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- addresses — customers manage their own; admins can read
-- ---------------------------------------------------------------------------
alter table public.addresses enable row level security;
revoke all on public.addresses from anon, authenticated;
grant select, insert, update, delete on public.addresses to authenticated;

drop policy if exists "addresses_select_own_or_admin" on public.addresses;
create policy "addresses_select_own_or_admin" on public.addresses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "addresses_insert_own" on public.addresses;
create policy "addresses_insert_own" on public.addresses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "addresses_update_own" on public.addresses;
create policy "addresses_update_own" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "addresses_delete_own" on public.addresses;
create policy "addresses_delete_own" on public.addresses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- orders + order_items
-- Customers read their own; admins read all and update order status.
-- No insert grant for anon/authenticated: checkout inserts via service role.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.order_items enable row level security;
revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = (select auth.uid()) or (select public.is_admin()))
    )
  );
