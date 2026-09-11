-- Glamour Atacado · regras de negócio
-- Erros sobem com a mensagem em código (ex.: 'below_minimum') e detalhes em JSON no detail;
-- o site traduz para o português em src/lib/orders.ts.

create function public.create_order(p_customer_name text, p_customer_phone text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.settings%rowtype;
  v_name text := btrim(regexp_replace(coalesce(p_customer_name, ''), '\s+', ' ', 'g'));
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_seq integer;
  v_order_id uuid;
  v_order_number text;
  v_total integer := 0;
  v_pieces integer := 0;
  v_lines jsonb := '[]'::jsonb;
  r record;
begin
  if length(v_phone) in (12, 13) and left(v_phone, 2) = '55' then
    v_phone := substr(v_phone, 3);
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if v_phone !~ '^[1-9]{2}(9[0-9]{8}|[2-5][0-9]{7})$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 300 then
    raise exception 'too_many_items' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.orders o
    where o.customer_phone = v_phone and o.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select * into v_settings from public.settings where id = 1;
  if not found then
    raise exception 'settings_missing' using errcode = 'P0001';
  end if;

  -- Preço e disponibilidade vêm sempre do banco; o site só manda id e quantidade
  for r in
    with req as (
      select (e ->> 'product_id')::uuid as product_id,
             sum((e ->> 'quantity')::integer)::integer as quantity,
             min(ord) as pos
      from jsonb_array_elements(p_items) with ordinality as t (e, ord)
      group by 1
    )
    select req.product_id, req.quantity, p.name, p.code, p.size, p.shade, p.price_cents, p.stock,
           coalesce(p.active and c.active, false) as available
    from req
    left join public.products p on p.id = req.product_id
    left join public.categories c on c.id = p.category_id
    order by req.pos
  loop
    if not r.available then
      raise exception 'product_unavailable' using errcode = 'P0001',
        detail = json_build_object('code', coalesce(r.code, r.product_id::text))::text;
    end if;
    if r.quantity is null or r.quantity < 1 or r.quantity > 9999 then
      raise exception 'invalid_quantity' using errcode = 'P0001',
        detail = json_build_object('code', r.code)::text;
    end if;
    if r.stock is not null and r.quantity > r.stock then
      raise exception 'insufficient_stock' using errcode = 'P0001',
        detail = json_build_object('code', r.code, 'available', r.stock)::text;
    end if;

    v_total := v_total + r.price_cents * r.quantity;
    v_pieces := v_pieces + r.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', r.product_id,
      'name', r.name,
      'code', r.code,
      'size', r.size,
      'shade', r.shade,
      'unit_price_cents', r.price_cents,
      'quantity', r.quantity,
      'total_cents', r.price_cents * r.quantity
    );
  end loop;

  if v_total < v_settings.min_order_cents then
    raise exception 'below_minimum' using errcode = 'P0001',
      detail = json_build_object('total_cents', v_total, 'min_order_cents', v_settings.min_order_cents)::text;
  end if;

  insert into public.order_counters as oc (day, last) values (v_day, 1)
  on conflict (day) do update set last = oc.last + 1
  returning last into v_seq;

  v_order_number := 'GLM-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 3, '0');

  insert into public.orders (order_number, customer_name, customer_phone, total_cents, item_count)
  values (v_order_number, v_name, v_phone, v_total, v_pieces)
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, product_code, size, shade, unit_price_cents, quantity, total_cents
  )
  select v_order_id, (l ->> 'product_id')::uuid, l ->> 'name', l ->> 'code', l ->> 'size', l ->> 'shade',
         (l ->> 'unit_price_cents')::integer, (l ->> 'quantity')::integer, (l ->> 'total_cents')::integer
  from jsonb_array_elements(v_lines) as l;

  insert into public.events (type, meta)
  values ('order_created', jsonb_build_object('order_number', v_order_number, 'total_cents', v_total));

  return jsonb_build_object(
    'order_number', v_order_number,
    'customer_name', v_name,
    'customer_phone', v_phone,
    'total_cents', v_total,
    'item_count', v_pieces,
    'min_order_cents', v_settings.min_order_cents,
    'items', v_lines
  );
end;
$$;

revoke all on function public.create_order(text, text, jsonb) from public;
grant execute on function public.create_order(text, text, jsonb) to anon, authenticated;


-- Muda o status e mantém o estoque coerente:
-- confirmado/separando/pronto/retirado = estoque baixado; qualquer outro = estoque devolvido.
create function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_should_apply boolean := p_status in ('confirmado', 'separando', 'pronto', 'retirado');
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  if v_should_apply and not v_order.stock_applied then
    update public.products p
    set stock = greatest(p.stock - oi.quantity, 0)
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = p_order_id and product_id is not null
      group by product_id
    ) oi
    where p.id = oi.product_id and p.stock is not null;
  elsif not v_should_apply and v_order.stock_applied then
    update public.products p
    set stock = p.stock + oi.quantity
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = p_order_id and product_id is not null
      group by product_id
    ) oi
    where p.id = oi.product_id and p.stock is not null;
  end if;

  update public.orders
  set status = p_status, stock_applied = v_should_apply
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.set_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;


-- Números do painel para um período, mais o "hoje" (fuso de São Paulo)
create function public.admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'orders_count', count(*),
    'pending_count', count(*) filter (where status in ('novo', 'em_atendimento')),
    'confirmed_count', count(*) filter (where status in ('confirmado', 'separando', 'pronto', 'retirado')),
    'cancelled_count', count(*) filter (where status = 'cancelado'),
    'total_cents', coalesce(sum(total_cents) filter (where status <> 'cancelado'), 0),
    'by_status', coalesce((
      select jsonb_object_agg(s.status, s.n)
      from (
        select status, count(*) as n from public.orders
        where created_at >= p_from and created_at < p_to
        group by status
      ) s
    ), '{}'::jsonb),
    'today_count', (select count(*) from public.orders where created_at >= v_today_start),
    'today_total_cents', (
      select coalesce(sum(total_cents), 0) from public.orders
      where created_at >= v_today_start and status <> 'cancelado'
    ),
    'top_added', coalesce((
      select jsonb_agg(t)
      from (
        select e.product_id, p.name, p.code, count(*) as n
        from public.events e
        join public.products p on p.id = e.product_id
        where e.type = 'add_to_cart' and e.created_at >= p_from and e.created_at < p_to
        group by e.product_id, p.name, p.code
        order by n desc
        limit 5
      ) t
    ), '[]'::jsonb),
    'top_sold', coalesce((
      select jsonb_agg(t)
      from (
        select oi.product_id, oi.product_name as name, oi.product_code as code, sum(oi.quantity) as n
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where o.status in ('confirmado', 'separando', 'pronto', 'retirado')
          and o.created_at >= p_from and o.created_at < p_to
        group by oi.product_id, oi.product_name, oi.product_code
        order by n desc
        limit 5
      ) t
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders
  where created_at >= p_from and created_at < p_to;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated;


-- Próximo código livre da categoria (BR-101, BR-102, ...)
create function public.next_product_code(p_category_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_last integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select code_prefix into v_prefix from public.categories where id = p_category_id;
  if v_prefix is null then
    return null;
  end if;

  select max(substring(code from '^' || v_prefix || '-([0-9]+)$')::integer)
  into v_last
  from public.products
  where code ~ ('^' || v_prefix || '-[0-9]+$');

  return v_prefix || '-' || lpad((coalesce(v_last, 100) + 1)::text, 3, '0');
end;
$$;

revoke all on function public.next_product_code(uuid) from public, anon;
grant execute on function public.next_product_code(uuid) to authenticated;
