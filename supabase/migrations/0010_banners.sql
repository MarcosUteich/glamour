-- Banners administráveis, com ordem e duração individual.
alter table public.settings add column banners jsonb not null default '[]'::jsonb
  check (jsonb_typeof(banners) = 'array');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "admin envia banners" on storage.objects
  for insert to authenticated with check (bucket_id = 'banners' and public.is_admin());
create policy "admin apaga banners" on storage.objects
  for delete to authenticated using (bucket_id = 'banners' and public.is_admin());
