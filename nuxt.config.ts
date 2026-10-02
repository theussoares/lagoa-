// As layers em ./layers (core, ui, customer, merchant, admin) são registradas
// automaticamente pelo Nuxt 4 e ganham os aliases #layers/<nome>.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // SPA enquanto o backend é mock: o "servidor" falso vive no navegador
  // (localStorage) e SSR renderizaria outro estado. Revisar no ADR do backend.
  ssr: false,
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  runtimeConfig: {
    public: {
      /** 'mock' até o backend existir; 'http' quando o ADR do CTO sair. */
      apiMode: 'mock',
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
        { name: 'theme-color', content: '#E9EEF0', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#181B1D', media: '(prefers-color-scheme: dark)' },
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
      background_color: '#E9EEF0',
      theme_color: '#E9EEF0',
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
