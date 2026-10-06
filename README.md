# Glamour Lindóia Atacado

Catálogo de atacado da **Glamour Lindóia** (Lindóia Shopping, loja 160, Porto Alegre). O cliente monta um pedido
de no mínimo **R$ 499** (valor definido em `/admin` → Config) e envia pelo **WhatsApp** da loja; a retirada é
na loja.

Preços: cada peça é cadastrada com o **preço original**; o **preço de atacado** é esse preço com o desconto definido
em `/admin` → Config (igual para todas as peças). O card e a página da peça mostram o de atacado em destaque e o
original riscado; o pedido é cobrado pelo de atacado, calculado no banco (`0009_desconto_atacado.sql`, mesma conta
de `src/seo/pricing.ts`). Com desconto 0%, o site mostra um preço só.

Fluxo: catálogo → carrinho → pedido ≥ mínimo → nome + WhatsApp → mensagem pronta no WhatsApp.

## Stack

Vite + React + TypeScript + Tailwind v4 + Supabase (Postgres + Auth + Storage). O painel `/admin` é carregado
sob demanda e usa o supabase-js; a loja fala com o banco por uma API REST leve (`src/lib/rest.ts`). As regras ficam
em funções Postgres (`supabase/migrations/0003_functions.sql` e `0007`).
O servidor Node (`server/index.ts`) entrega o SEO de cada página e já **monta a página no servidor**
(`src/entry-server.tsx`): o HTML chega com textos, peças e links, e o React só hidrata. Na Vercel (`api/`), o SEO
é o mesmo e a página é montada no navegador.

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
| `npm run build` | Type-check + build do site (`dist/`) + build do servidor (`dist-server/`) |
| `npm start` | Sobe o servidor de produção (site + SEO) na porta `PORT` (padrão 3000) |
| `npm run test` | Vitest (libs, SEO, origem dos pedidos e regras do banco via PGlite) |
| `npm run lint` | ESLint |
| `npm run brand` | Regenera o letreiro e o "G" a partir do SVG da fachada (otimizados com svgo) |
| `npm run artes` | Renderiza as artes de divulgação em `marketing/out/` e, em `public/`, a arte de compartilhar, o logo, os ícones e o `favicon.ico` (pedido mínimo atual do painel) |

## Supabase

Aplique na ordem, pelo SQL editor do projeto: `supabase/migrations/0001_schema.sql` a
`0009_desconto_atacado.sql` e depois `supabase/seed.sql` (ou `supabase/sample-data.sql` para ter peças de exemplo).
Crie o usuário admin em Authentication e insira o `user_id` dele em `public.admins`.

## Deploy

Duas opções, com a mesma lógica de SEO (`src/seo/`, testada com Vitest):

- **VPS / Docker** (a loja está num VPS da Hostinger): `Dockerfile` pronto para Coolify, EasyPanel, Dokploy ou
  `docker run`. O servidor entrega cada página já montada, com título, canonical, Open Graph e dados estruturados,
  responde 404 para peça que saiu do catálogo, redireciona `www` e barras no fim, serve `/sitemap.xml`,
  `/robots.txt` e `/catalogo.xml` (Meta) e faz o ping que evita a pausa do Supabase Free.
- **Vercel** (plano Pro, para uso comercial): o `vercel.json` manda as rotas públicas para `api/page.ts` e
  serve sitemap, robots e catálogo por funções; o cron diário `api/keepalive.ts` evita a pausa do Supabase Free.

Variáveis: `VITE_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GA_ID`, `VITE_META_PIXEL_ID` e as
opcionais do `.env.example`. O passo a passo de publicação, DNS, Search Console, Google Analytics, Google Ads,
Pixel e catálogo da Meta, Perfil da Empresa e aviso de cookies está em [`docs/SEO.md`](docs/SEO.md).

## Estrutura

```
src/lib/        dinheiro, telefone, WhatsApp, catálogo, medição (tracking), cookies (consent), origem (attribution)
src/store/      carrinho (zustand + localStorage) e sua lógica testável
src/data/api.ts leitura do catálogo + create_order (com fallback de demonstração)
src/pages/      loja: Home, ProductPage, OrderPage, OrderConfirmedPage, MyOrdersPage, PrivacyPage, HowToBuyPage
src/admin/      painel: login, dashboard, pedidos, produtos, categorias, config (com as perguntas frequentes)
src/seo/        dados da loja, títulos, head/JSON-LD, perguntas frequentes, sitemap, robots, catálogo da Meta, handlers
src/routes.tsx  rotas (iguais no navegador e no servidor); client-pages.ts carrega as páginas sob demanda
src/entry-server.tsx  página montada no servidor (usada por server/index.ts)
server/         servidor Node de produção (VPS/Docker)
api/            funções da Vercel (mesmos handlers de src/seo)
supabase/       migrations + seed + testes de RLS/regras
marketing/      templates HTML das artes + render.mjs
scripts/        extract-logo.mjs e brand-svg.mjs (SVG da fachada → arquivos de marca)
```
