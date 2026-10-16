// Link da bio do Instagram (links.lagoamais.com.br). App à parte da LP: deploy, domínio e
// métrica próprios, mas o mesmo tema e as mesmas fontes (layer ui).
import { fileURLToPath } from 'node:url'
import { SECURITY_HEADERS } from '../web/server/utils/securityHeaders'

export default defineNuxtConfig({
  extends: ['../web/layers/ui'],
  alias: {
    '#shared': fileURLToPath(new URL('../../shared', import.meta.url)),
    '#layers/ui': fileURLToPath(new URL('../web/layers/ui', import.meta.url)),
  },
  compatibilityDate: '2026-10-01',
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/links.css'],
  i18n: {
    defaultLocale: 'pt-BR',
    strategy: 'no_prefix',
    locales: [{ code: 'pt-BR', language: 'pt-BR', name: 'Português', file: 'pt-BR.json' }],
  },
  colorMode: { preference: 'dark', fallback: 'dark' },
  routeRules: { '/**': { headers: SECURITY_HEADERS } },
  nitro: {
    prerender: { routes: ['/', '/robots.txt'], crawlLinks: false },
  },
  runtimeConfig: {
    public: {
      /** WhatsApp da rede, só dígitos com DDI. É número comercial, público. */
      whatsappNumber: '5567992171768',
      /** LP do lojista ("Quero ser loja parceira"), guia e blog. */
      siteUrl: 'https://lagoamais.com.br',
      /** App do cliente (carteira de carimbos). */
      customerUrl: 'https://app.lagoamais.com.br',
      /** Balcão, para o lojista que já é parceiro. */
      merchantUrl: 'https://balcao.lagoamais.com.br',
      /** Endereço desta página, para canonical e og:url. */
      linksUrl: 'https://links.lagoamais.com.br',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#062B3A' },
      ],
    },
  },
  typescript: { strict: true },
})
