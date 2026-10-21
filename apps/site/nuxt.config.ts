// Landing page do lojista. Separada do apps/web porque o app é SPA (o mock vive no
// localStorage) e a LP precisa de HTML pré-renderizado para SEO e LCP.
import { fileURLToPath } from 'node:url'
import { SECURITY_HEADERS } from '../web/server/utils/securityHeaders'

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
  // A LP é clara: a composição alterna o branco com as faixas de tinta (.dark no hero, Balcão,
  // preço e fechamento). O "abre no escuro" da layer ui vale para o app, não para cá.
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
    // O link da bio é só âncoras: sem JS ele chega pronto, sem hidratar nada. Custo: o analytics não conta aqui.
    '/links': { noScripts: true },
    // Escritório 3D da equipe de agentes: arquivos estáticos em public/equipe (gerados por `pnpm build:office`).
    '/equipe': { redirect: { to: '/equipe/', statusCode: 308 } },
  },
  nitro: {
    prerender: { routes: ['/', '/sitemap.xml', '/robots.txt'], crawlLinks: true },
  },
  runtimeConfig: {
    public: {
      /** WhatsApp da rede, só dígitos com DDI. É número comercial, público. */
      whatsappNumber: '5567992171768',
      /** Onde o lojista já aprovado entra no Balcão. */
      appUrl: 'http://localhost:3000',
      /** App do cliente (carteira de carimbos), destino do link da bio. */
      customerUrl: 'https://app.lagoamais.com.br',
      /** Endereço público da LP, para canonical e og:url. Vazio omite as duas. */
      siteUrl: '',
    },
  },
  hooks: {
    // As seções abaixo da dobra hidratam ao entrar na tela (`hydrate-on-visible`); o Nuxt ainda
    // pré-carregaria o JS delas junto com o HTML. Aqui o chunk só desce quando a seção chega perto.
    'build:manifest': (manifest) => {
      for (const entry of Object.values(manifest)) {
        if (entry.src && /components\/\w+Section\.vue$/.test(entry.src) && !/Hero/.test(entry.src)) {
          entry.preload = false
          entry.prefetch = false
        }
      }
    },
    // O prerender congela o runtimeConfig no HTML: um build com o Balcão em localhost
    // publicaria links quebrados. Para gerar local, defina NUXT_PUBLIC_APP_URL mesmo assim.
    'prerender:routes': () => {
      const appUrl = process.env.NUXT_PUBLIC_APP_URL ?? ''
      if (appUrl === '') {
        throw new Error('apps/site: defina NUXT_PUBLIC_APP_URL (endereço do Balcão) antes de gerar a LP.')
      }
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#062B3A' },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    },
  },
  typescript: {
    strict: true,
  },
})
