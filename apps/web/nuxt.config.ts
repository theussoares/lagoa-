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
    public: {
      /** 'mock' (localStorage) ou 'http' (API real do cliente; o painel do lojista segue mock). */
      apiMode: 'mock',
      /** Base da API (`/v1` incluso), só no modo http. Env: NUXT_PUBLIC_API_BASE_URL. */
      apiBaseUrl: '',
      /** Projeto Supabase do login do cliente e sua chave pública (anon/publishable), só no modo http. */
      supabaseUrl: '',
      supabaseAnonKey: '',
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
