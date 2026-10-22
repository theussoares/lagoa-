import { getPosts } from '../../app/content/posts'
import { getGuide } from '../../app/content/guide'
import { publicPath, SECTION_PATHS, SITE_LOCALES } from '../../app/content/routes'
import type { SiteLocale } from '../../app/types/locale'

interface SitemapPage {
  /** Identifica a mesma página nos dois idiomas, para o hreflang. */
  key: string
  paths: Record<SiteLocale, string>
}

function pages(): SitemapPage[] {
  const entries: SitemapPage[] = [
    { key: 'home', paths: { 'pt-BR': '/', en: '/' } },
    { key: 'blog', paths: SECTION_PATHS.blog },
    { key: 'guide', paths: SECTION_PATHS.guide },
  ]
  for (const locale of SITE_LOCALES) {
    for (const post of getPosts(locale)) {
      const entry = entries.find((item) => item.key === `post:${post.id}`) ?? { key: `post:${post.id}`, paths: { 'pt-BR': '', en: '' } }
      entry.paths[locale] = `${SECTION_PATHS.blog[locale]}/${post.slug}`
      if (!entries.includes(entry)) entries.push(entry)
    }
    for (const guide of getGuide(locale)) {
      const entry = entries.find((item) => item.key === `guide:${guide.id}`) ?? { key: `guide:${guide.id}`, paths: { 'pt-BR': '', en: '' } }
      entry.paths[locale] = `${SECTION_PATHS.guide[locale]}/${guide.slug}`
      if (!entries.includes(entry)) entries.push(entry)
    }
  }
  return entries
}

/** Sitemap pré-renderizado: a LP é estática, então a lista de páginas sai dos arquivos de conteúdo. Cada URL lista a versão nos dois idiomas. */
export default defineEventHandler((event) => {
  const siteUrl = (useRuntimeConfig(event).public.siteUrl as string).replace(/\/$/, '')
  const href = (locale: SiteLocale, page: SitemapPage): string => {
    const path = publicPath(locale, page.paths[locale])
    return `${siteUrl}${path === '/' ? '' : path}`
  }
  const urls = pages().flatMap((page) =>
    SITE_LOCALES.map((locale) => {
      const alternates = SITE_LOCALES.map((code) => `<xhtml:link rel="alternate" hreflang="${code}" href="${href(code, page)}"/>`).join('')
      return `  <url><loc>${href(locale, page)}</loc>${alternates}<xhtml:link rel="alternate" hreflang="x-default" href="${href('pt-BR', page)}"/></url>`
    }),
  )
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
})
