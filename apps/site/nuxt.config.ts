// Landing page do lojista. Separada do apps/web porque o app é SPA (o mock vive no
// localStorage) e a LP precisa de HTML pré-renderizado para SEO e LCP.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // Mesmo tema, fontes e componentes de carimbo do app: a LP mostra o produto de verdade.
  extends: ['../web/layers/ui'],
  alias: {
    '#shared': fileURLToPath(new URL('../../shared', import.meta.url)),
    // Mesmo alias que o apps/web ganha por ter a layer dentro de ./layers.
    '#layers/ui': fileURLToPath(new URL('../web/layers/ui', import.meta.url)),
  },
  compatibilityDate: '2026-10-01',
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/site.css'],
  i18n: {
    defaultLocale: 'pt-BR',
    strategy: 'no_prefix',
    locales: [{ code: 'pt-BR', language: 'pt-BR', name: 'Português', file: 'pt-BR.json' }],
  },
  // A LP segue o sistema da pessoa; o hero e o fechamento são sempre a faixa escura de tinta.
  colorMode: {
    preference: 'system',
    fallback: 'light',
  },
  nitro: {
    prerender: { routes: ['/'], crawlLinks: true },
  },
  runtimeConfig: {
    public: {
      /** Só dígitos com DDI (5567...). Vazio abre o WhatsApp para escolher o contato. */
      whatsappNumber: '',
      /** Onde o lojista já aprovado entra no Balcão. */
      appUrl: 'http://localhost:3000',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0B3538' },
      ],
    },
  },
  typescript: {
    strict: true,
  },
})
