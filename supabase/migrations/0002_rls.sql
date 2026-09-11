-- Glamour Atacado · segurança (RLS)
-- Visitante: lê catálogo ativo e configurações, registra eventos. Pedidos só pela função create_order.
-- Admin: quem está na tabela admins.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_counters enable row level security;
alter table public.settings enable row level security;
alter table public.events enable row level security;
alter table public.admins enable row level security;

-- Catálogo
create policy "categorias ativas são públicas" on public.categories
  for select using (active or public.is_admin());
create policy "admin gerencia categorias" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "produtos ativos são públicos" on public.products
  for select using (
    (active and exists (select 1 from public.categories c where c.id = category_id and c.active))
    or public.is_admin()
  );
create policy "admin gerencia produtos" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A subconsulta respeita o RLS de products: imagem de produto inativo fica oculta
create policy "imagens de produtos visíveis" on public.product_images
  for select using (exists (select 1 from public.products p where p.id = product_id));
create policy "admin gerencia imagens" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Configurações
create policy "configurações são públicas" on public.settings
  for select using (true);
create policy "admin altera configurações" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: sem política de insert (só create_order, que é security definer)
create policy "admin vê pedidos" on public.orders
  for select to authenticated using (public.is_admin());
create policy "admin atualiza pedidos" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin vê itens" on public.order_items
  for select to authenticated using (public.is_admin());

-- Status e estoque só mudam por set_order_status; direto na tabela, só as anotações
revoke insert, update, delete on public.orders from anon, authenticated;
grant update (admin_notes) on public.orders to authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke all on public.order_counters from anon, authenticated;

-- Eventos (o tipo é validado pelo check da tabela)
create policy "visitantes registram eventos" on public.events
  for insert to anon, authenticated with check (true);
create policy "admin vê eventos" on public.events
  for select to authenticated using (public.is_admin());

create policy "admin vê o próprio registro" on public.admins
  for select to authenticated using (user_id = auth.uid());
