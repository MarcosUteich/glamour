# SEO, Google e medição: o que fazer fora do código

O código já entrega o que o Google precisa:

- título, descrição e canonical por página;
- dados estruturados de loja local (`JewelryStore`), produto e trilha de navegação;
- `sitemap.xml` e `robots.txt` sempre atualizados;
- 404 de verdade para peça que saiu do catálogo;
- prévia com foto e preço no WhatsApp e no Instagram;
- Google Analytics 4 e Pixel da Meta.

O que falta é cadastro e configuração nas contas, nesta ordem.

## 1. Domínio e Vercel

1. Registre o domínio (ex.: `glamouratacado.com.br` no registro.br) e aponte para o projeto na Vercel.
2. Na Vercel, escolha entre **com ou sem `www`** e marque o outro para redirecionar.
3. Em *Settings → Environment Variables* (Production), defina:

   | Variável | Valor |
   |---|---|
   | `VITE_SITE_URL` | `https://seu-dominio.com.br` (sem barra no fim) |
   | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | as mesmas do `.env.local` |
   | `VITE_GA_ID` | ID do GA4 (passo 3) |
   | `VITE_META_PIXEL_ID` | ID do Pixel (passo 4) |

4. No Supabase, rode `supabase/migrations/0006_seo.sql` no SQL Editor. Ela cria a descrição das categorias com textos iniciais, que você edita em `/admin` → Categorias.
5. Em `/admin` → Config, atualize o **texto de retirada** para o endereço completo, igual ao do Perfil da Empresa no Google:
   > Glamour Acessórios · Lindóia Shopping · Loja 160 · Av. Assis Brasil, 3522 · Porto Alegre/RS
6. Quando o horário estiver definido, preencha `openingHours` em `src/seo/business.ts` e o horário em `/admin` → Config.

> Lembrete: o plano Hobby (grátis) da Vercel não permite uso comercial. Use o Pro ou migre para o Cloudflare Pages.

## 2. Google Search Console (é por ele que o Google fica sabendo do site)

1. Em https://search.google.com/search-console, adicione uma propriedade do tipo **Domínio** e confirme com o registro TXT no painel DNS do registro.br.
2. Em *Sitemaps*, envie `https://seu-dominio.com.br/sitemap.xml`.
3. Em *Inspeção de URL*, cole a home e 2 ou 3 categorias e clique em **Solicitar indexação**.
4. Nas semanas seguintes, acompanhe em *Páginas* quais foram indexadas e em *Desempenho* quais buscas trazem gente.

## 3. Google Analytics 4

1. Em https://analytics.google.com, crie a propriedade com fuso de São Paulo e moeda Real (BRL).
2. Crie um fluxo de dados **Web** com o domínio e copie o **ID da métrica** (`G-…`) para `VITE_GA_ID`.
3. Em *Administrador → Eventos*, marque como **evento-chave**:
   - `generate_lead` (pedido registrado);
   - `whatsapp_click` (tocou para enviar o pedido).
4. Em *Administrador → Links de produtos*, vincule o **Search Console**.
5. Para testar, use o *DebugView* enquanto navega no site publicado.

Eventos enviados: `page_view`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `generate_lead`, `whatsapp_click`, todos com valor em BRL e as peças.

## 4. Pixel da Meta (anúncios no Instagram e Facebook)

1. No Gerenciador de Eventos (business.facebook.com), crie um conjunto de dados/Pixel e copie o ID para `VITE_META_PIXEL_ID`.
2. Em *Configurações do Pixel*, deixe **Correspondência avançada automática desligada**. O site não envia nome nem WhatsApp à Meta, e a página de Privacidade diz isso.
3. Em *Configurações da empresa → Segurança da marca → Domínios*, **verifique o domínio**. É exigência para anunciar.
4. Para testar, use a extensão *Meta Pixel Helper* do Chrome.

Eventos enviados: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Lead` e `Contact`.

## 5. Perfil da Empresa no Google (o que mais pesa em "perto de mim" e no Maps)

1. Em https://business.google.com, reivindique ou crie **Glamour Acessórios** com o mesmo endereço (Loja 160, Lindóia Shopping) e telefone do site.
2. Escolha uma categoria principal de loja de bijuterias/semijoias e adicione "atacadista" como categoria secundária.
3. Informe horário, WhatsApp e o site com `?utm_source=google&utm_medium=perfil`.
4. Poste fotos da fachada, do interior e das peças, e peça avaliação às clientes depois da retirada.

## 6. Links para o site

- Bio do Instagram: `https://seu-dominio.com.br/?utm_source=instagram&utm_medium=bio`
- Perfil do WhatsApp Business: o campo "site" com o mesmo link, trocando para `utm_source=whatsapp`.
- Peça à administração do Lindóia Shopping para colocar o link na página da loja.
- O cartaz e o cartão já saem com `utm_source=cartaz` e `utm_source=cartao` (`npm run artes`).

## 7. Conteúdo que faz subir na busca

- Descrição **própria** em cada peça, sem copiar a do fornecedor.
- Um texto curto em cada categoria (`/admin` → Categorias).
- Fotos boas, com fundo claro.
- Nome, endereço e telefone iguais em todo lugar: site, Perfil da Empresa, Instagram.

## 8. Acompanhar todo mês

- **Search Console:** buscas, cliques, páginas indexadas e erros.
- **PageSpeed Insights** (https://pagespeed.web.dev), sempre no modo celular.
- **GA4:** de onde vêm as visitas (*Aquisição*) e quantos `generate_lead`.
- **Teste de pesquisa aprimorada** (https://search.google.com/test/rich-results): cole a URL de um produto e confira "Produto" e "Trilha de navegação".

## Não precisa ou não vale a pena

- Meta keywords (o Google ignora).
- Comprar links ou esconder texto (dá punição).
- Google Merchant Center (exige compra online no site).
