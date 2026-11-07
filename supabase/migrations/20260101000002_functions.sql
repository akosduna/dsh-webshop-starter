-- =============================================================================
-- 0002 — Functions: admin check, atomic stock decrement, mark order paid
-- =============================================================================

-- True when the current user has role = 'admin'. SECURITY DEFINER so RLS
-- policies can call it without recursing into profiles' own policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

-- Decrement stock for a variant (if given) or a product. Atomic, never below 0.
-- Returns the new stock quantity (NULL if the row no longer exists).
create or replace function public.decrement_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'p_quantity must be positive';
  end if;

  if p_variant_id is not null then
    update public.product_variants
       set stock_quantity = greatest(stock_quantity - p_quantity, 0)
     where id = p_variant_id
    returning stock_quantity into v_new;
  elsif p_product_id is not null then
    update public.products
       set stock_quantity = greatest(stock_quantity - p_quantity, 0)
     where id = p_product_id
    returning stock_quantity into v_new;
  end if;

  return v_new;
end;
$$;

-- Called by the Stripe webhook (and the success page as a fallback).
-- Idempotent: the first call marks the order paid and decrements stock for
-- every item; any later call (Stripe retries, double delivery) returns false
-- and changes nothing. The UPDATE row lock serialises concurrent calls.
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_payment_intent_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_item record;
begin
  update public.orders
     set payment_status = 'paid',
         status = case when status = 'pending_payment' then 'paid' else status end,
         paid_at = coalesce(paid_at, now()),
         stock_decremented_at = now()
   where id = p_order_id
     and stripe_payment_intent_id = p_payment_intent_id
     and stock_decremented_at is null
  returning id into v_order_id;

  if v_order_id is null then
    return false;
  end if;

  for v_item in
    select oi.product_id, oi.variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = v_order_id
  loop
    perform public.decrement_stock(v_item.product_id, v_item.variant_id, v_item.quantity);
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges (Postgres grants EXECUTE to PUBLIC by default)
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

revoke all on function public.decrement_stock(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, uuid, integer) to service_role;

revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text) to service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_category_depth() from public, anon, authenticated;
