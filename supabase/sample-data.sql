-- Glamour Atacado · categorias e produtos de amostra
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente: pode rodar de novo sem duplicar (categorias por slug, produtos por code).
-- As peças não têm fotos ainda — o catálogo mostra uma ilustração dourada no lugar até
-- você cadastrar as fotos reais pelo painel /admin.

insert into public.settings (id, whatsapp_number, min_order_cents, pickup_text)
values (1, '5551992275944', 49000, 'Glamour Acessórios · Shopping Lindoia · Porto Alegre/RS')
on conflict (id) do nothing;

insert into public.categories (name, slug, code_prefix, sort_order) values
  ('Brincos', 'brincos', 'BR', 10),
  ('Colares', 'colares', 'CL', 20),
  ('Pulseiras', 'pulseiras', 'PL', 30),
  ('Anéis', 'aneis', 'AN', 40),
  ('Piercings', 'piercings', 'PC', 50),
  ('Tornozeleiras', 'tornozeleiras', 'TZ', 60),
  ('Conjuntos', 'conjuntos', 'CJ', 70),
  ('Pingentes', 'pingentes', 'PG', 80),
  ('Correntes', 'correntes', 'CR', 90),
  ('Maquiagem', 'maquiagem', 'MQ', 100)
on conflict (slug) do nothing;

with v (category_slug, code, name, slug, description, material, plating, size, shade, weight_g, price_cents, stock, created_at) as (
  values
    ('brincos', 'BR-101', 'Brinco argola lisa', 'brinco-argola-lisa-br-101',
     'Argola clássica e leve, com fecho click. Vende o ano inteiro.', 'Latão', 'Ouro 18k', '2,5 cm', null, 1.8, 2490, null, now() - interval '3 days'),
    ('brincos', 'BR-102', 'Brinco ponto de luz', 'brinco-ponto-de-luz-br-102',
     null, 'Zircônia', 'Ródio branco', '6 mm', null, 0.9, 1990, 40, now() - interval '12 days'),
    ('brincos', 'BR-103', 'Brinco gota cristal', 'brinco-gota-cristal-br-103',
     null, 'Cristal', 'Ouro 18k', '3 cm', null, 2.4, 3290, 25, now() - interval '20 days'),

    ('colares', 'CL-101', 'Colar riviera', 'colar-riviera-cl-101',
     'Peça de destaque na vitrine — vende sozinha.', 'Zircônias', 'Ouro 18k', '45 cm', null, 6.2, 7990, 15, now() - interval '5 days'),
    ('colares', 'CL-102', 'Colar ponto de luz', 'colar-ponto-de-luz-cl-102',
     null, 'Latão', 'Ouro 18k', '40 cm + extensor 5 cm', null, 3.1, 3290, null, now() - interval '18 days'),
    ('colares', 'CL-103', 'Choker elos', 'choker-elos-cl-103',
     null, 'Latão', 'Ouro 18k', '35 cm', null, 4.5, 4590, 20, now() - interval '8 days'),

    ('pulseiras', 'PL-101', 'Pulseira elos cartier', 'pulseira-elos-cartier-pl-101',
     null, 'Latão', 'Ouro 18k', '18 cm', null, 3.6, 3990, null, now() - interval '15 days'),
    ('pulseiras', 'PL-102', 'Pulseira riviera', 'pulseira-riviera-pl-102',
     null, 'Zircônias', 'Ródio branco', '17 cm', null, 5.0, 5990, 12, now() - interval '25 days'),

    ('aneis', 'AN-101', 'Anel solitário', 'anel-solitario-an-101',
     'Aro ajustável — serve na maioria dos dedos.', 'Zircônia', 'Ouro 18k', 'Aro 16 (ajustável)', null, 1.2, 2990, 30, now() - interval '10 days'),
    ('aneis', 'AN-102', 'Anel trançado', 'anel-trancado-an-102',
     null, 'Latão', 'Ouro 18k', 'Aros 14 a 20', null, 1.6, 2490, null, now() - interval '22 days'),

    ('piercings', 'PC-101', 'Piercing argolinha', 'piercing-argolinha-pc-101',
     null, 'Aço cirúrgico', 'Ouro 18k', '8 mm', null, 0.4, 1290, 50, now() - interval '9 days'),

    ('tornozeleiras', 'TZ-101', 'Tornozeleira bolinhas', 'tornozeleira-bolinhas-tz-101',
     null, 'Latão', 'Ouro 18k', '23 cm + extensor', null, 2.0, 2790, null, now() - interval '4 days'),

    ('conjuntos', 'CJ-101', 'Conjunto coração', 'conjunto-coracao-cj-101',
     'Colar + brinco combinando — ótimo para presente.', 'Latão', 'Ouro 18k', 'Colar 45 cm · brinco 1 cm', null, 5.4, 6990, 10, now() - interval '14 days'),

    ('pingentes', 'PG-101', 'Pingente letra', 'pingente-letra-pg-101',
     'Todas as letras do alfabeto disponíveis — combine no pedido pelo WhatsApp.', 'Latão', 'Ouro 18k', '1,2 cm', null, 0.6, 1890, null, now() - interval '17 days'),

    ('correntes', 'CR-101', 'Corrente veneziana', 'corrente-veneziana-cr-101',
     null, 'Latão', 'Ouro 18k', '60 cm', null, 4.8, 3490, 18, now() - interval '11 days'),

    ('maquiagem', 'MQ-101', 'Batom matte', 'batom-matte-nude-02-mq-101',
     'Alta pigmentação e longa duração. Caixa fechada com 6 unidades do mesmo tom.', null, null, null, 'Nude 02', null, 990, 60, now() - interval '2 days'),
    ('maquiagem', 'MQ-102', 'Paleta de sombras', 'paleta-de-sombras-rose-mq-102',
     null, null, null, null, 'Rosé · 9 cores', null, 2890, 20, now() - interval '19 days'),
    ('maquiagem', 'MQ-103', 'Máscara de cílios volume', 'mascara-de-cilios-volume-mq-103',
     null, null, null, null, 'Preta', null, 1490, 35, now() - interval '6 days')
)
insert into public.products (
  category_id, code, name, slug, description, material, plating, size, shade, weight_g,
  price_cents, stock, active, created_at
)
select c.id, v.code, v.name, v.slug, v.description, v.material, v.plating, v.size, v.shade, v.weight_g,
       v.price_cents, v.stock, true, v.created_at
from v
join public.categories c on c.slug = v.category_slug
on conflict (code) do nothing;
