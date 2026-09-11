-- Glamour Atacado · fotos dos produtos (Supabase Storage)
-- Leitura pública pela URL; envio, troca e exclusão só para admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "admin envia fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admin troca fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "admin apaga fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
