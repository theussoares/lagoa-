import { SITE_LOCALES } from '../content/routes'

/**
 * Cabeçalho de idioma da página: `lang`, `og:locale`, canonical e o par de hreflang (com x-default no português).
 */
export function useLocaleSeo(): void {
  const { locale, locales } = useI18n()
  const alternatePath = useAlternatePath()
  const { siteUrl } = useRuntimeConfig().public
  const base = siteUrl.replace(/\/$/, '')

  const current = computed(() => locales.value.find((item) => item.code === locale.value))

  function absolute(path: string): string {
    return `${base}${path === '/' ? '' : path}`
  }

  function links() {
    if (!base) return []
    const alternates = SITE_LOCALES.map((code) => ({ rel: 'alternate' as const, hreflang: code, href: absolute(alternatePath(code)) }))
    const canonical = { rel: 'canonical' as const, href: absolute(alternatePath(locale.value === 'en' ? 'en' : 'pt-BR')) }
    const fallback = { rel: 'alternate' as const, hreflang: 'x-default', href: absolute(alternatePath('pt-BR')) }
    return [canonical, ...alternates, fallback]
  }

  useHead(() => ({ htmlAttrs: { lang: locale.value }, link: links() }))
  useSeoMeta({ ogLocale: () => (current.value?.language ?? 'pt-BR').replace('-', '_') })
}
