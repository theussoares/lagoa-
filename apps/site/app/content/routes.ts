import type { SiteLocale } from '../types/locale'

export const DEFAULT_LOCALE: SiteLocale = 'pt-BR'
export const SITE_LOCALES: readonly SiteLocale[] = ['pt-BR', 'en']

/** Caminho de cada seção por idioma. O nome da pasta da página continua em inglês; só a URL muda. */
export const SECTION_PATHS = {
  blog: { 'pt-BR': '/blog', en: '/blog' },
  guide: { 'pt-BR': '/guia', en: '/guide' },
} as const satisfies Record<string, Record<SiteLocale, string>>

/** Caminho público de uma rota do idioma (o padrão não leva prefixo). Para o sitemap, que roda fora do Vue. */
export function publicPath(locale: SiteLocale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === '/' ? '/en' : `/en${path}`
}
