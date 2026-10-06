-- Glamour Atacado · desconto de atacado
-- O preço cadastrado em cada peça passa a ser o preço original. O preço de atacado é esse preço com o desconto
-- definido em /admin → Config, igual para todas as peças. A loja mostra os dois (o de atacado em destaque, o
-- original riscado) e o pedido é cobrado pelo de atacado, sempre calculado aqui no banco.
-- Começa em 0%: nada muda até a loja definir o desconto. Pode rodar de novo sem problema.

alter table public.settings
  add column if not exists wholesale_discount_pct smallint not null default 0
  check (wholesale_discount_pct between 0 and 90);

comment on column public.settings.wholesale_discount_pct is
  'Desconto do atacado sobre o preço original das peças, em % (0 a 90). 0 = sem desconto: o site mostra um preço só.';

-- As políticas de settings (leitura pública, alteração só pelo admin) já valem para a coluna nova.


-- Preço de atacado de uma peça: arredondado ao centavo (meio centavo sobe) e nunca zero.
-- A mesma conta está em src/seo/pricing.ts, para o site mostrar o preço antes do pedido.
create or replace function public.wholesale_price_cents(p_price_cents integer, p_discount_pct integer)
returns integer
language sql
immutable
as $$
  select greatest(1, round(p_price_cents * (100 - least(greatest(coalesce(p_discount_pct, 0), 0), 90)) / 100.0))::integer
$$;


-- create_order cobrando o preço de atacado (o resto é igual ao da migration 0007)
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_attribution jsonb default null
)
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
  -- Origem inválida ou grande demais é descartada, nunca impede o pedido
  v_attribution jsonb := case
    when jsonb_typeof(p_attribution) = 'object' and pg_column_size(p_attribution) <= 4096 then p_attribution
  end;
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

  -- Preço e disponibilidade vêm sempre do banco; o site só manda id e quantidade.
  -- O preço cobrado é o de atacado: o original da peça com o desconto de Config.
  for r in
    with req as (
      select (e ->> 'product_id')::uuid as product_id,
             sum((e ->> 'quantity')::integer)::integer as quantity,
             min(ord) as pos
      from jsonb_array_elements(p_items) with ordinality as t (e, ord)
      group by 1
    )
    select req.product_id, req.quantity, p.name, p.code, p.size, p.shade, p.stock,
           public.wholesale_price_cents(p.price_cents, v_settings.wholesale_discount_pct) as unit_price_cents,
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

    v_total := v_total + r.unit_price_cents * r.quantity;
    v_pieces := v_pieces + r.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', r.product_id,
      'name', r.name,
      'code', r.code,
      'size', r.size,
      'shade', r.shade,
      'unit_price_cents', r.unit_price_cents,
      'quantity', r.quantity,
      'total_cents', r.unit_price_cents * r.quantity
    );
  end loop;

  -- O pedido mínimo vale para o total já com o desconto (o que a cliente paga)
  if v_total < v_settings.min_order_cents then
    raise exception 'below_minimum' using errcode = 'P0001',
      detail = json_build_object('total_cents', v_total, 'min_order_cents', v_settings.min_order_cents)::text;
  end if;

  insert into public.order_counters as oc (day, last) values (v_day, 1)
  on conflict (day) do update set last = oc.last + 1
  returning last into v_seq;

  v_order_number := 'GLM-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 3, '0');

  insert into public.orders (order_number, customer_name, customer_phone, total_cents, item_count, attribution)
  values (v_order_number, v_name, v_phone, v_total, v_pieces, v_attribution)
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, product_code, size, shade, unit_price_cents, quantity, total_cents
  )
  select v_order_id, (l ->> 'product_id')::uuid, l ->> 'name', l ->> 'code', l ->> 'size', l ->> 'shade',
         (l ->> 'unit_price_cents')::integer, (l ->> 'quantity')::integer, (l ->> 'total_cents')::integer
  from jsonb_array_elements(v_lines) as l;

  insert into public.events (type, meta)
  values ('order_created', jsonb_strip_nulls(jsonb_build_object(
    'order_number', v_order_number,
    'total_cents', v_total,
    'source', left(v_attribution #>> '{last,source}', 60)
  )));

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

revoke all on function public.create_order(text, text, jsonb, jsonb) from public;
grant execute on function public.create_order(text, text, jsonb, jsonb) to anon, authenticated;
