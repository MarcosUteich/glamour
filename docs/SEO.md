# SEO, Google, Meta e medição: o que fazer fora do código

O código entrega o que o Google, a Meta e o WhatsApp precisam:

- título, descrição, canonical e Open Graph por página, com o endereço sempre em `https://` (mesmo que
  `VITE_SITE_URL` seja cadastrado só como `glamourlindoia.com.br`);
- dados estruturados da loja (`JewelryStore` com endereço, mapa, coordenadas, horário, Instagram), do site
  (`WebSite`), de cada produto (`Product` com preço, estoque e pedido mínimo) e da trilha de navegação;
- `sitemap.xml` e `robots.txt` sempre atualizados, 404 de verdade para peça que saiu do catálogo e categoria
  sem peças fora do Google;
- redirecionamento 301 para um endereço só por página (sem barra no fim, catálogo em minúsculas, `www` → sem `www`);
- prévia de link no WhatsApp/Facebook/Instagram com a foto da peça em JPEG quadrado (1080 px);
- `catalogo.xml`: o catálogo de produtos no formato da Meta (anúncios de catálogo e marcação no Instagram);
- Google Analytics 4, Pixel da Meta, Google Ads e Microsoft Clarity (os dois últimos opcionais), carregados só
  depois do "Aceitar" no aviso de cookies (LGPD);
- a origem de cada pedido (Instagram, Google, anúncio, cartaz...) gravada no pedido e mostrada no painel;
- tags de verificação de domínio do Google e da Meta, se você preferir verificar por metatag;
- páginas **montadas no servidor**: título, textos, peças, preços e links já vêm no HTML (o Google indexa sem
  esperar o JavaScript, e buscadores de IA e prévias que não rodam JavaScript leem o conteúdo);
- página **Como comprar** (`/como-comprar`) com passo a passo, onde retirar e perguntas frequentes editáveis em
  `/admin` → Config (dados estruturados `FAQPage`);
- `favicon.ico`, ícones, `manifest.webmanifest`, logo (`/brand/logo.png`) e arte de compartilhar
  (`/brand/og-image.png`) gerados por `npm run artes`.

## Lista de SEO: o que já está pronto

| Item | Situação |
|---|---|
| `robots.txt` | Gerado pelo servidor, aponta para o sitemap e bloqueia `/admin` e `/api/` |
| `sitemap.xml` | Gerado do banco: home, novidades, categorias com peças, cada peça (com a foto), Como comprar, Privacidade |
| `favicon.ico` | `public/favicon.ico` (16, 32 e 48 px) + `favicon.svg` + ícone da Apple |
| `site.webmanifest` | É o `public/manifest.webmanifest` (o nome do arquivo não importa, só o `<link rel="manifest">`) |
| Logo | `/brand/logo.png` (512 px), ligado aos dados da loja (`logo` do `JewelryStore`) |
| Imagem de compartilhar | `/brand/og-image.png` (1200×630) na home; a foto da peça na página da peça; a foto da peça mais nova nas categorias |
| Title e meta description | Por página, montados no servidor com os dados do banco (nome, preço, pedido mínimo atual) |
| Canonical | Em todas as páginas públicas; busca (`?busca=`), pedido e painel ficam `noindex` |
| Open Graph / Twitter | Por página, com foto em JPEG quadrado; na peça, as tags de produto da Meta (código, estoque, marca) |
| Schema.org / JSON-LD | `JewelryStore` (é um `LocalBusiness`/`Organization`), `WebSite`, `Product`, `BreadcrumbList`, `FAQPage` |
| URLs amigáveis | `/categoria/brincos`, `/produto/brinco-argola-lisa-br-101`, `/como-comprar` |
| Redirecionamentos 301 | `www` → sem `www`, barra no fim, maiúsculas, `/index.html` |
| HTTPS | Certificado pelo Caddy + `Strict-Transport-Security` do servidor |
| Core Web Vitals | Medido no Lighthouse (celular, 4G lento), antes → depois: home LCP 3,0 s → 1,8–2,3 s; categoria 3,0 s → 2,2 s; peça 5,9 s → 2,9 s e CLS 0,13 → 0,01 |
| H1, H2, H3 | Um H1 por página (loja, categoria, nome da peça, Como comprar); seções em H2; peças da lista em H2/H3 |
| Textos das páginas | Descrição de cada categoria (`/admin` → Categorias) e de cada peça; Como comprar |
| Páginas de serviço | Como comprar (passo a passo, retirada, horário, WhatsApp) |
| FAQ | Em Como comprar; editável em `/admin` → Config (depois da migration 0008) |
| Blog / guias | Ainda não. Planejado para dezembro (como começar a revender, atacado × consignado, quanto cobrar) |
| Search Console, Analytics, Perfil da Empresa, sitemap enviado | Dependem de você: seções 5, 6 e 9 |

O que falta é publicar do jeito certo e fazer os cadastros nas contas, nesta ordem.

## 1. Publicar com as funções de SEO

Em 27/09/2026, `glamourlindoia.com.br` apontava para um VPS da Hostinger (`srv1692643.hstgr.cloud`) que
entregava só os arquivos do build: `/sitemap.xml` e `/robots.txt` voltavam como página HTML, todas as páginas
saíam com o título e o canonical da home e peça inexistente não dava 404. As funções de SEO precisam rodar junto
com o site. Escolha um caminho:

### A) No mesmo VPS, com Docker (recomendado: sem custo novo)

O `Dockerfile` do projeto gera o site e sobe o servidor Node (`server/index.ts`) na porta **3000**.

No Coolify, EasyPanel ou Dokploy da VPS:

1. Crie um app a partir do repositório (ou do upload do projeto) com **build por Dockerfile**.
2. Cadastre as variáveis da seção 3 como **variáveis de build** (build args) e também de execução.
3. Porta do app: **3000**. Verificação de saúde (health check): `/healthz`.
4. Domínios: `glamourlindoia.com.br` e `www.glamourlindoia.com.br`, com HTTPS. O servidor manda o `www` para o
   endereço sem `www`.
5. Desligue o app antigo (o que servia só os arquivos estáticos) depois que o novo estiver no ar.

Sem painel, direto no VPS: copie a pasta do projeto (sem `node_modules`, `dist` e `dist-server`) com o `.env`
preenchido e, dentro dela, rode:

```bash
docker build -t glamour .
docker rm -f glamour 2>/dev/null
docker run -d --name glamour --restart unless-stopped -p 127.0.0.1:3000:3000 glamour
```

O build lê as variáveis do `.env` que está na pasta (`--build-arg VITE_GA_ID=...` só se quiser sobrescrever
alguma). O `127.0.0.1:` deixa a porta 3000 fechada para a internet: quem atende o público é o Caddy. Para publicar
uma versão nova, copie a pasta de novo e repita os três comandos.

No Caddy (ou Nginx) da VPS, troque o bloco que servia os arquivos (`root` / `file_server`) por:

```
glamourlindoia.com.br, www.glamourlindoia.com.br {
  reverse_proxy 127.0.0.1:3000
}
```

e rode `systemctl reload caddy`. Crie o `www` no DNS (seção 2) antes de pôr o `www` no Caddy, senão o certificado
dele falha.

Sem Docker também funciona: no seu computador, `npm run build` (lê o `.env.local`/`.env`); envie as pastas `dist/`
e `dist-server/` para o VPS e, na pasta onde elas ficaram, rode `HOST=127.0.0.1 node dist-server/index.js` com
Node 22, como serviço (systemd ou pm2) para voltar sozinho quando o VPS reiniciar. Não precisa de `npm install` no
VPS: o servidor usa só módulos do próprio Node.

### B) Na Vercel

O `vercel.json` e a pasta `api/` já fazem o mesmo papel. O plano Hobby (grátis) **não permite uso comercial**:
use o Pro (US$ 20/mês). Cadastre as variáveis da seção 3 em *Settings → Environment Variables* e aponte o domínio.

### Conferir depois de publicar

- `https://glamourlindoia.com.br/robots.txt` mostra texto com a linha `Sitemap:`;
- `https://glamourlindoia.com.br/sitemap.xml` e `/catalogo.xml` mostram XML;
- `https://glamourlindoia.com.br/produto/qualquer-coisa` responde 404;
- no código-fonte da home (Ctrl+U), o `canonical` é `https://glamourlindoia.com.br/` e o `<div id="root">` já
  vem com os textos e as peças (páginas montadas no servidor);
- cole o link de uma peça no WhatsApp: a prévia aparece com a foto;
- https://pagespeed.web.dev no modo celular, na home e numa peça.

## 2. DNS (Hostinger → Domínios → DNS / Nameservers)

- **www**: hoje `www.glamourlindoia.com.br` não existe no DNS. Crie um registro `CNAME` `www` →
  `glamourlindoia.com.br` (ou um `A` para o mesmo IP do domínio). Quem digitar com `www` cai na loja.
- **Google Search Console**: registro `TXT` que o Search Console mostrar (seção 5).
- **Meta**: registro `TXT` da verificação de domínio (seção 8), se não usar a metatag.

## 3. Variáveis

| Variável | Valor | Obrigatória |
|---|---|---|
| `VITE_SITE_URL` | `https://glamourlindoia.com.br` | sim |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | as do projeto no Supabase | sim |
| `VITE_GA_ID` | ID do GA4, `G-…` (seção 6) | para medir |
| `VITE_META_PIXEL_ID` | ID do Pixel, só números (seção 8) | para anunciar na Meta |
| `VITE_GOOGLE_ADS_ID` / `VITE_GOOGLE_ADS_LEAD_LABEL` | `AW-…` e o rótulo da conversão (seção 7) | não |
| `VITE_CLARITY_ID` | ID do projeto no Microsoft Clarity | não |
| `VITE_GOOGLE_SITE_VERIFICATION` | código da "Tag HTML" do Search Console | não (use o DNS) |
| `VITE_META_DOMAIN_VERIFICATION` | código da "Metatag" da Meta | não (use o DNS) |

As `VITE_*` entram no build: depois de mudar alguma, publique de novo. Pode colar a tag inteira nas de
verificação; o código extrai o `content`.

## 4. Supabase

1. No SQL Editor, rode `supabase/migrations/0007_origem_e_fotos.sql` e `0008_como_comprar.sql` (e a
   `0006_seo.sql`, se ainda não rodou; todas podem rodar de novo sem problema). A 0007 grava a origem de cada
   pedido, cria a coluna da foto JPEG para compartilhar e acrescenta "Pedidos por origem" no painel. A 0008 guarda
   as perguntas frequentes da página Como comprar. O site funciona antes e depois delas.
2. Em `/admin` → Config → **Perguntas frequentes**, acrescente o que só a loja pode responder: formas de
   pagamento, troca e garantia, nota fiscal, se precisa de CNPJ, envio para outras cidades. Os marcadores
   `{pedido_minimo}`, `{retirada}`, `{horario}` e `{whatsapp}` acompanham as configurações.
3. Em `/admin` → Config, confira: **pedido mínimo** (R$ 799,90; o código usa o mesmo valor quando o banco não responde),
   texto de retirada com "Loja 160", horário com acentos e o link do Instagram.
4. Plano: o Free pausa o projeto após 1 semana sem uso (o servidor Node faz um acesso a cada 12 horas para evitar)
   e inclui 5 GB de tráfego por mês. Com anúncios rodando, passe para o **Pro** (US$ 25/mês).
5. Fotos cadastradas antes da 0007 não têm o JPEG de compartilhar; a prévia usa a foto grande. Se quiser o JPEG,
   apague e envie a foto de novo no painel.

## 5. Google Search Console (é por ele que o Google fica sabendo do site)

1. Em https://search.google.com/search-console, adicione uma propriedade do tipo **Domínio** e confirme com o
   registro `TXT` no DNS da Hostinger. (Alternativa: propriedade "Prefixo do URL" com a Tag HTML em
   `VITE_GOOGLE_SITE_VERIFICATION`.)
2. Em *Sitemaps*, envie `https://glamourlindoia.com.br/sitemap.xml`.
3. Em *Inspeção de URL*, cole a home e 2 ou 3 categorias e clique em **Solicitar indexação**.
4. Nas semanas seguintes, acompanhe em *Páginas* o que foi indexado e em *Desempenho* quais buscas trazem gente.
5. Cole uma página de peça no **Teste de pesquisa aprimorada** (https://search.google.com/test/rich-results):
   devem aparecer "Produto" e "Trilha de navegação".

## 6. Google Analytics 4

1. Em https://analytics.google.com, crie a propriedade com fuso de São Paulo e moeda Real (BRL).
2. Crie um fluxo de dados **Web** com o domínio e copie o **ID da métrica** (`G-…`) para `VITE_GA_ID`.
3. Em *Administrador → Eventos*, marque como **evento-chave**: `generate_lead` (pedido registrado) e
   `whatsapp_click` (tocou para enviar o pedido).
4. Em *Administrador → Links de produtos*, vincule o **Search Console** e o **Google Ads**.
5. Para testar, abra o site, aceite os cookies e acompanhe o *DebugView*.

Eventos enviados: `page_view`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`,
`generate_lead`, `whatsapp_click`, todos com valor em BRL e as peças.

## 7. Google Ads

A página de alianças já tem uma tag do Google Ads (`AW-18090998787`). Se a conta for sua, use a mesma, numa
campanha separada para o atacado. Duas formas de contar o pedido como conversão:

- **Mais simples:** importar o evento-chave `generate_lead` do GA4 (*Metas → Conversões → Importar*).
- **Direto no Ads:** crie a conversão "Pedido de atacado" (categoria *Enviar formulário de lead*), copie o ID
  `AW-…` e o rótulo para `VITE_GOOGLE_ADS_ID` e `VITE_GOOGLE_ADS_LEAD_LABEL`. O site envia o valor e o número
  do pedido.

## 8. Meta: Pixel, domínio e catálogo (Facebook e Instagram)

1. No Gerenciador de Eventos (business.facebook.com), crie o conjunto de dados/Pixel e copie o ID para
   `VITE_META_PIXEL_ID`. Deixe a **correspondência avançada automática desligada**: o site não envia nome nem
   WhatsApp à Meta, e a página de Privacidade diz isso.
2. Em *Configurações da empresa → Segurança da marca → Domínios*, **verifique** `glamourlindoia.com.br` pelo
   registro `TXT` no DNS ou pela metatag (`VITE_META_DOMAIN_VERIFICATION`).
3. **Catálogo:** no Gerenciador de Commerce, crie um catálogo de *E-commerce*, vá em *Fontes de dados → Feed
   de dados → Feed programado* e informe `https://glamourlindoia.com.br/catalogo.xml`, com atualização diária.
   O `id` de cada item é o código da peça, o mesmo que o Pixel envia: assim a Meta liga a visita ao produto e
   libera os anúncios de catálogo (mostram a peça que a pessoa viu). Com desconto de atacado em `/admin` → Config,
   o preço original vai em `price` e o de atacado em `sale_price` (o anúncio mostra o original riscado), igual às
   tags da página da peça e ao `StrikethroughPrice` dos dados estruturados do Google.
4. **Instagram:** com o Instagram profissional ligado ao portfólio, o catálogo aprovado e o domínio verificado,
   ative a marcação de produtos (*Instagram → Configurações → Compras*).
5. Para testar, use a extensão *Meta Pixel Helper* do Chrome (depois de aceitar os cookies no site).

Eventos enviados: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Lead` e `Contact`. O `Lead` e o
`Contact` levam o número do pedido como `eventID`, pronto para a API de Conversões não contar o pedido duas vezes.

## 9. Perfil da Empresa no Google (já existe: "Glamour Lindóia", nota 5,0)

1. Categorias secundárias de atacado, bijuterias/semijoias e maquiagem; descrição com "semijoias no atacado",
   "revenda" e "retirada no Lindóia Shopping". **Não** ponha essas palavras no nome do perfil (dá suspensão).
2. Site com `?utm_source=google&utm_medium=perfil`.
3. Horário igual ao do site (o perfil mostra fechado no domingo; o shopping abre das 14h às 19h). Se a loja abrir
   aos domingos, acrescente o domingo em `src/seo/business.ts` também.
4. Em *Pedir avaliações*, copie o link e cole em `reviewUrl` (`src/seo/business.ts`): a mensagem de "Retirado"
   do painel passa a pedir a avaliação. Nunca ofereça desconto ou brinde em troca.
5. Peça ao Lindóia Shopping o link do site e do Instagram na página da loja.

## 10. Aviso de cookies (LGPD)

O aviso aparece quando há pelo menos uma ferramenta de medição configurada. Nada do Google, da Meta ou do Clarity
carrega antes do "Aceitar"; quem recusa não é medido. A pessoa muda a escolha em "Preferências de cookies", no
rodapé. Se passar a coletar algo novo, suba `VERSION` em `src/lib/consent.ts` para o aviso aparecer de novo.

## 11. Links para o site (com UTM, para o painel mostrar a origem)

- Bio do Instagram: `https://glamourlindoia.com.br/?utm_source=instagram&utm_medium=bio`
- Perfil do WhatsApp Business: o mesmo link com `utm_source=whatsapp&utm_medium=perfil`
- Anúncios da Meta: `?utm_source=meta&utm_medium=paid_social&utm_campaign=<nome>`
- Google Maps: `?utm_source=google&utm_medium=perfil`
- O cartaz e o cartão já saem com `utm_source=cartaz` e `utm_source=cartao` (`npm run artes`).

## 12. Conteúdo que faz subir na busca

- Descrição **própria** em cada peça, sem copiar a do fornecedor.
- Um texto curto em cada categoria (`/admin` → Categorias), com as grafias que as revendedoras usam:
  "semijoias atacado", "atacado de semijoias", "semi joias atacado", "semijoias para revenda".
- Perguntas frequentes completas em `/admin` → Config (pagamento, troca, CNPJ): respondem o que a revendedora
  pesquisa antes de comprar.
- Fotos boas, com fundo claro.
- Nome, endereço e telefone iguais em todo lugar: site, Perfil da Empresa, Instagram.
- Mudou o pedido mínimo? Rode `npm run artes` para o post, o story e o cartaz saírem com o valor novo (a arte de
  compartilhar do site não tem valor escrito; o texto da prévia usa o valor atual sozinho).

## 13. Acompanhar todo mês

- **Search Console:** buscas, cliques, páginas indexadas e erros.
- **PageSpeed Insights** (https://pagespeed.web.dev), sempre no modo celular.
- **GA4:** de onde vêm as visitas (*Aquisição*) e quantos `generate_lead`.
- **Painel da loja:** "Pedidos por origem" e o status de cada pedido.
- **Gerenciador de Commerce:** itens do catálogo com erro.

## Não precisa ou não vale a pena

- Meta keywords (o Google ignora).
- Comprar links ou esconder texto (dá punição).
- Google Tag Manager: o site já dispara os eventos sozinho.
- Google Merchant Center / Shopping: exige que a compra termine no site, com entrega ou ponto de coleta. O
  `catalogo.xml` já está no formato dele, se um dia o site tiver pagamento.
