import type { Post } from '~/types/content'
import type { SiteLocale } from '~/types/locale'
import { POST_TEXTS as POST_TEXTS_EN } from './posts.en'
import { POST_TEXTS as POST_TEXTS_PT } from './posts.pt-BR'

/** Dados que não mudam entre idiomas. A ordem daqui é a da listagem. */
const POST_META = [
  { id: 'whyCustomersDontReturn', date: '2026-10-01', readingMinutes: 4 },
  { id: 'costOfLosingCustomers', date: '2026-10-03', readingMinutes: 4 },
  { id: 'paperVsDigitalCard', date: '2026-10-06', readingMinutes: 5 },
  { id: 'chooseStampGoal', date: '2026-10-09', readingMinutes: 4 },
] as const

const TEXTS = { 'pt-BR': POST_TEXTS_PT, en: POST_TEXTS_EN } as const

export function getPosts(locale: SiteLocale): Post[] {
  return POST_META.flatMap((meta) => {
    const text = TEXTS[locale].find((item) => item.id === meta.id)
    return text ? [{ ...text, date: meta.date, readingMinutes: meta.readingMinutes }] : []
  })
}

export function findPost(locale: SiteLocale, slug: string): Post | undefined {
  return getPosts(locale).find((post) => post.slug === slug)
}

/** O slug do mesmo artigo em cada idioma, a partir do slug de um deles. Alimenta o seletor de idioma e o hreflang. */
export function postSlugs(locale: SiteLocale, slug: string): Record<SiteLocale, string> | undefined {
  const id = TEXTS[locale].find((item) => item.slug === slug)?.id
  if (!id) return undefined
  return {
    'pt-BR': POST_TEXTS_PT.find((item) => item.id === id)?.slug ?? '',
    en: POST_TEXTS_EN.find((item) => item.id === id)?.slug ?? '',
  }
}
