-- Glamour Atacado · consulta de pedidos pelo WhatsApp (sem login)
-- O telefone funciona como "senha" fraca: quem sabe o WhatsApp da cliente vê os pedidos
-- dela. Para dificultar varredura de números, cada busca é registrada e limitada.

create table public.phone_lookups (
  id bigint generated always as identity primary key,
  phone text not null,
  created_at timestamptz not null default now()
);
create index phone_lookups_phone_created_idx on public.phone_lookups (phone, created_at desc);

alter table public.phone_lookups enable row level security;
-- Sem políticas: só a função abaixo (security definer, dona = quem aplicou a migration) acessa.

create function public.get_orders_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if length(v_phone) in (12, 13) and left(v_phone, 2) = '55' then
    v_phone := substr(v_phone, 3);
  end if;
  if v_phone !~ '^[1-9]{2}(9[0-9]{8}|[2-5][0-9]{7})$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.phone_lookups
    where phone = v_phone and created_at > now() - interval '10 minutes'
  ) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.phone_lookups (phone) values (v_phone);

  return coalesce(
    (
      select jsonb_agg(t.summary order by t.created_at desc)
      from (
        select
          ord.created_at,
          jsonb_build_object(
            'order_number', ord.order_number,
            'created_at', ord.created_at,
            'status', ord.status,
            'total_cents', ord.total_cents,
            'item_count', ord.item_count,
            'items', (
              select jsonb_agg(jsonb_build_object(
                'product_id', oi.product_id,
                'name', oi.product_name,
                'code', oi.product_code,
                'size', oi.size,
                'shade', oi.shade,
                'unit_price_cents', oi.unit_price_cents,
                'quantity', oi.quantity,
                'total_cents', oi.total_cents
              ) order by oi.id)
              from public.order_items oi
              where oi.order_id = ord.id
            )
          ) as summary
        from public.orders ord
        where ord.customer_phone = v_phone
        order by ord.created_at desc
        limit 50
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_orders_by_phone(text) from public;
grant execute on function public.get_orders_by_phone(text) to anon, authenticated;
