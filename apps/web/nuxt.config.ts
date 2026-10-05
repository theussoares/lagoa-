// As layers em ./layers (core, ui, customer, merchant, admin) são registradas
// automaticamente pelo Nuxt 4 e ganham os aliases #layers/<nome>.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // `shared/` mora na raiz do monorepo para o futuro `apps/api` usar os mesmos contratos.
  alias: { '#shared': fileURLToPath(new URL('../../shared', import.meta.url)) },
  compatibilityDate: '2026-10-01',
  // SPA enquanto o backend é mock: o "servidor" falso vive no navegador
  // (localStorage) e SSR renderizaria outro estado. Revisar no ADR do backend.
  ssr: false,
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  runtimeConfig: {
    /** Só no servidor (BFF em `server/`): nada daqui chega ao navegador. Env sem o prefixo PUBLIC. */
    /** Base da API (`/v1` incluso). Env: NUXT_API_BASE_URL. */
    apiBaseUrl: '',
    /** Chave pública (anon/publishable) do Supabase usada pelo login no servidor. Env: NUXT_SUPABASE_ANON_KEY. */
    supabaseAnonKey: '',
    /** Segredo que prova à API que a chamada vem deste BFF e libera o IP real do cliente (limite por IP). Mesmo valor de BFF_SHARED_SECRET na API. Env: NUXT_BFF_SHARED_SECRET. */
    bffSharedSecret: '',
    /** Origens extras (separadas por vírgula) que podem escrever em `/api/**`; o próprio host sempre pode. Env: NUXT_ALLOWED_ORIGINS. */
    allowedOrigins: '',
    public: {
      /** 'mock' (localStorage) ou 'http' (API real do cliente, via BFF `/api`; o painel do lojista segue mock). */
      apiMode: 'mock',
      /** URL do projeto Supabase (não é segredo): login no servidor e fotos do bucket público. */
      supabaseUrl: '',
      /** Atraso artificial do mock para a UI exercitar carregamento. */
      mockLatencyMs: 250,
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Lagoa+',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#FFFFFF', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#08201F', media: '(prefers-color-scheme: dark)' },
      ],
    },
  },
  pwa: {
    // O service worker gerado mandava toda navegação para "/" sem ter "/" no
    // cache: depois da primeira visita, recarregar ou abrir um link quebrava.
    // Até o PWA ter ícones e uma estratégia de cache revisada, publicamos um
    // service worker que se remove sozinho (e limpa quem já instalou o antigo).
    selfDestroying: true,
    registerType: 'autoUpdate',
    manifest: {
      name: 'Lagoa+',
      short_name: 'Lagoa+',
      lang: 'pt-BR',
      start_url: '/carteira',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#08201F',
      theme_color: '#08201F',
      // Ícones entram quando existir logo (PRODUCT.md: nada de marca inventada).
      icons: [],
    },
    workbox: { navigateFallback: '/' },
    devOptions: { enabled: false },
  },
  typescript: {
    strict: true,
  },
})
