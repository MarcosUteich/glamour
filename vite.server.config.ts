import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Build do servidor Node (server/index.ts → dist-server/index.js), para rodar em VPS ou Docker.
// Junta num arquivo só o servidor, a lógica de SEO de src/seo e a loja em React (páginas montadas no servidor,
// src/entry-server.tsx), com todas as dependências dentro: a imagem Docker não precisa de node_modules.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  ssr: { noExternal: true },
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: false,
  },
})
