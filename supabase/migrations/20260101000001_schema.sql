-- =============================================================================
-- 0001 — Schema: tables, sequence, indexes, triggers
-- Safe to re-run: every object uses IF NOT EXISTS / OR REPLACE.
-- Money is stored as integer cents (EUR). 1990 = 19,90 €.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, role decides admin access
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories — max one level of subcategories (parent_id)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_not_own_parent check (parent_id is null or parent_id <> id)
);

create index if not exists categories_parent_id_idx on public.categories (parent_id);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Enforce a single level: a parent must be top-level, and a category that
-- already has children cannot become a child itself.
create or replace function public.enforce_category_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (
      select 1 from public.categories c
      where c.id = new.parent_id and c.parent_id is not null
    ) then
      raise exception 'Nadkategorija ne smije i sama biti podkategorija.';
    end if;
    if exists (select 1 from public.categories c where c.parent_id = new.id) then
      raise exception 'Kategorija koja ima podkategorije ne može postati podkategorija.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_enforce_depth on public.categories;
create trigger categories_enforce_depth
  before insert or update of parent_id on public.categories
  for each row execute function public.enforce_category_depth();

-- ---------------------------------------------------------------------------
-- products — option_names lists variant dimensions, e.g. {Veličina,Boja}.
-- stock_quantity is used only when the product has no variants.
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  sku text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  option_names text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_active_featured_idx on public.products (is_active, is_featured);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_images — first by sort_order is the main image
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  storage_path text,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- product_variants — options e.g. {"Veličina": "M", "Boja": "Crna"}.
-- price_cents NULL = use the product price.
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  options jsonb not null default '{}'::jsonb,
  sku text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id, sort_order);

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- addresses — saved addresses of logged-in customers.
-- Orders keep their own address snapshot, so deleting an address is safe.
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  company text,
  street text not null,
  city text not null,
  postal_code text not null,
  country text not null default 'HR',
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shipping_methods — flat-rate delivery, free-shipping threshold, pickup
-- ---------------------------------------------------------------------------
create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null default 'delivery' check (type in ('delivery', 'pickup')),
  price_cents integer not null default 0 check (price_cents >= 0),
  free_over_cents integer check (free_over_cents is null or free_over_cents >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists shipping_methods_set_updated_at on public.shipping_methods;
create trigger shipping_methods_set_updated_at
  before update on public.shipping_methods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- store_settings — exactly one row (id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'Moja trgovina',
  tagline text,
  contact_email text,
  contact_phone text,
  address text,
  currency text not null default 'EUR' check (currency = 'EUR'),
  hero_title text,
  hero_subtitle text,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orders + order_items
-- Address, product names and prices are snapshots taken at checkout time.
-- ---------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start with 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  phone text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed', 'refunded')),
  shipping_method_id uuid references public.shipping_methods (id) on delete set null,
  shipping_method_name text not null,
  shipping_method_type text not null default 'delivery' check (shipping_method_type in ('delivery', 'pickup')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'EUR',
  shipping_address jsonb,
  billing_address jsonb not null,
  customer_note text,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  stock_decremented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.order_number_seq owned by public.orders.order_number;

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_name text,
  sku text,
  image_url text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
