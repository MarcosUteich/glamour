-- Glamour Atacado · dados iniciais (pode rodar mais de uma vez)

insert into public.settings (id, whatsapp_number, min_order_cents, pickup_text)
values (1, '5551992275944', 49000, 'Glamour Acessórios · Lindóia Shopping · Loja 160 · Av. Assis Brasil, 3522 · Porto Alegre/RS')
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
