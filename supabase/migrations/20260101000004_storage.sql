-- =============================================================================
-- 0004 — Storage bucket for product images (public read, admin write)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_bucket_public_read" on storage.objects;
create policy "product_images_bucket_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product_images_bucket_admin_insert" on storage.objects;
create policy "product_images_bucket_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product_images_bucket_admin_update" on storage.objects;
create policy "product_images_bucket_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product_images_bucket_admin_delete" on storage.objects;
create policy "product_images_bucket_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
