# Glamour Atacado

Catálogo de atacado da **Glamour Acessórios** (Shopping Lindoia, Porto Alegre). O cliente
monta um pedido de no mínimo **R$ 490** e envia pelo **WhatsApp** da loja; a retirada é na loja.

Fluxo: catálogo → carrinho → pedido ≥ R$ 490 → nome + WhatsApp → mensagem pronta no WhatsApp.

## Stack

Vite + React + TypeScript + Tailwind v4 + Supabase (Postgres + Auth + Storage). SPA única;
o painel `/admin` é carregado sob demanda. Sem backend próprio — as regras ficam em funções
Postgres (`supabase/migrations/0003_functions.sql`).

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Sem as chaves do Supabase o site roda em **modo demonstração** com produtos de exemplo
(o painel fica indisponível).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Type-check + build de produção |
| `npm run test` | Vitest (libs + regras do banco via PGlite) |
| `npm run lint` | ESLint |
| `npm run brand` | Regenera os arquivos de marca a partir do SVG da fachada |
| `npm run artes` | Renderiza as artes de divulgação em `marketing/out/` |

## Supabase

Aplique na ordem, pelo SQL editor do projeto: `supabase/migrations/0001_schema.sql`,
`0002_rls.sql`, `0003_functions.sql`, `0004_storage.sql` e depois `supabase/seed.sql`.
Crie o usuário admin em Authentication e insira o `user_id` dele em `public.admins`.

## Deploy

Vercel (`vercel.json` já tem o rewrite de SPA e o cron diário do `api/keepalive.ts`, que
evita a pausa do plano Free do Supabase). Defina `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
e `VITE_SITE_URL` nas variáveis do projeto.

## Estrutura

```
src/lib/        dinheiro, telefone, WhatsApp, catálogo, tipos
src/store/      carrinho (zustand + localStorage) e sua lógica testável
src/data/api.ts leitura do catálogo + create_order (com fallback de demonstração)
src/pages/      loja: Home, ProductPage, OrderPage, OrderConfirmedPage, PrivacyPage
src/admin/      painel: login, dashboard, pedidos, produtos, categorias, config
supabase/       migrations + seed + testes de RLS/regras
marketing/      templates HTML das artes + render.mjs
scripts/        extract-logo.mjs (SVG da fachada → arquivos de marca)
```
