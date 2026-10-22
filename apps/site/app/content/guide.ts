import type { GuideEntry } from '~/types/content'
import type { SiteLocale } from '~/types/locale'
import { GUIDE_TEXTS as GUIDE_TEXTS_EN } from './guide.en'
import { GUIDE_TEXTS as GUIDE_TEXTS_PT } from './guide.pt-BR'

/** Dados que não mudam entre idiomas. A ordem daqui é a da listagem. */
const GUIDE_META = [
  { id: 'getStarted', icon: 'i-ph-rocket-launch-bold' },
  { id: 'generateQr', icon: 'i-ph-qr-code-bold' },
  { id: 'redemption', icon: 'i-ph-gift-bold' },
  { id: 'bonusRules', icon: 'i-ph-sparkle-bold' },
] as const

const TEXTS = { 'pt-BR': GUIDE_TEXTS_PT, en: GUIDE_TEXTS_EN } as const

export function getGuide(locale: SiteLocale): GuideEntry[] {
  return GUIDE_META.flatMap((meta) => {
    const text = TEXTS[locale].find((item) => item.id === meta.id)
    return text ? [{ ...text, icon: meta.icon }] : []
  })
}

export function findGuide(locale: SiteLocale, slug: string): GuideEntry | undefined {
  return getGuide(locale).find((entry) => entry.slug === slug)
}

/** O slug da mesma entrada em cada idioma, a partir do slug de um deles. Alimenta o seletor de idioma e o hreflang. */
export function guideSlugs(locale: SiteLocale, slug: string): Record<SiteLocale, string> | undefined {
  const id = TEXTS[locale].find((item) => item.slug === slug)?.id
  if (!id) return undefined
  return {
    'pt-BR': GUIDE_TEXTS_PT.find((item) => item.id === id)?.slug ?? '',
    en: GUIDE_TEXTS_EN.find((item) => item.id === id)?.slug ?? '',
  }
}
