# Loja Glamour em Docker: build do site + servidor Node com as funções de SEO e as páginas montadas no servidor.
# Serve para VPS (Hostinger), Coolify, EasyPanel, Dokploy, Railway ou qualquer lugar que rode Docker.
# As variáveis VITE_* entram no build (o navegador precisa delas) e também valem em tempo de execução.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_SITE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GA_ID
ARG VITE_META_PIXEL_ID
ARG VITE_GOOGLE_ADS_ID
ARG VITE_GOOGLE_ADS_LEAD_LABEL
ARG VITE_CLARITY_ID
ARG VITE_GOOGLE_SITE_VERIFICATION
ARG VITE_META_DOMAIN_VERIFICATION
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# package.json só pelo "type": "module" (o servidor é um arquivo só, sem node_modules)
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "dist-server/index.js"]
