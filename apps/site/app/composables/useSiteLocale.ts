import type { SiteLocale } from '../types/locale'

/** O idioma da página, já estreitado para os dois que o site tem. */
export function useSiteLocale(): ComputedRef<SiteLocale> {
  const { locale } = useI18n()
  return computed(() => (locale.value === 'en' ? 'en' : 'pt-BR'))
}
