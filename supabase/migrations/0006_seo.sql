-- Glamour Atacado · SEO
-- Descrição de cada categoria: aparece na página da categoria e é o texto que o Google mostra.

alter table public.categories
  add column if not exists description text
  check (description is null or char_length(description) <= 600);

-- Textos iniciais, só onde ainda não há descrição. Edite em /admin → Categorias.
update public.categories as c
set description = v.description
from (values
  ('brincos', 'Brincos para revender com preço de atacado: argolas, pontos de luz e modelos da moda. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('colares', 'Colares e chokers para revender com preço de atacado. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('pulseiras', 'Pulseiras para revender com preço de atacado, das delicadas às de destaque. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('aneis', 'Anéis para revender com preço de atacado. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('piercings', 'Piercings para revender com preço de atacado. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('tornozeleiras', 'Tornozeleiras para revender com preço de atacado. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('conjuntos', 'Conjuntos de colar e brinco para revender com preço de atacado, prontos para presente. Pedido pelo WhatsApp e retirada no Lindóia Shopping, em Porto Alegre.'),
  ('pingentes', 'Pingentes para revender com preço de atacado. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('correntes', 'Correntes para revender com preço de atacado, em vários tamanhos. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.'),
  ('maquiagem', 'Maquiagem no atacado para revender: batons, sombras, máscaras e mais. Monte o pedido pelo site, envie pelo WhatsApp e retire no Lindóia Shopping, em Porto Alegre.')
) as v (slug, description)
where c.slug = v.slug and c.description is null;
