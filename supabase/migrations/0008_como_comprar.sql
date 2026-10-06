-- Glamour Atacado · página "Como comprar"
-- Perguntas frequentes editáveis em /admin → Config. Aparecem em /como-comprar e nos dados estruturados
-- (FAQPage). Enquanto a coluna estiver vazia (null), o site mostra as perguntas padrão de src/seo/faq.ts.
-- Pode rodar de novo sem problema.

alter table public.settings
  add column if not exists faq jsonb
  check (
    faq is null
    or (jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 30 and pg_column_size(faq) <= 65536)
  );

comment on column public.settings.faq is
  'Perguntas frequentes da página Como comprar: [{"question": "...", "answer": "..."}]. null = perguntas padrão do site.';

-- As políticas de settings (leitura pública, alteração só pelo admin) já valem para a coluna nova.
